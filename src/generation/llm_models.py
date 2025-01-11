import datetime
from decimal import Decimal

import frontmatter
from anthropic import AsyncAnthropic


class BaseModel:
    # To be defined by subclass
    models = {
        # All prices in USD per million 'i' (input) tokens and 'o' (output) tokens
        'model-name': {
            'name': 'upstream-model-name',
            'price': { 'i': Decimal('0.0'), 'o': Decimal('0.0') },
        },
    }

    def __init__(self):
        self.model_name = None  # To be set by subclass
        self._usage = {
            'input_tokens': 0,
            'output_tokens': 0,
            'cache_write_tokens': 0,
            'cache_read_tokens': 0,
        }

    def set_usage(self, input_tokens, output_tokens, cache_write_tokens=0, cache_read_tokens=0):
        self._usage['input_tokens'] = input_tokens
        self._usage['output_tokens'] = output_tokens
        self._usage['cache_write_tokens'] = cache_write_tokens
        self._usage['cache_read_tokens'] = cache_read_tokens

    def compute_price(self, base_model=None):
        if base_model is None:
            base_model = self.model_name

        input_tokens = self._usage['input_tokens']
        output_tokens = self._usage['output_tokens']
        cache_write_tokens = self._usage['cache_write_tokens']
        cache_read_tokens = self._usage['cache_read_tokens']
        
        # Compute the price of the prompt and completion tokens for the current model
        price = self.models[base_model]['price']
        
        i_price = Decimal(input_tokens) * price['i'] / Decimal(1_000_000)
        o_price = Decimal(output_tokens) * price['o'] / Decimal(1_000_000)
        cw_price = Decimal(cache_write_tokens) * price['cw'] / Decimal(1_000_000)
        cr_price = Decimal(cache_read_tokens) * price['cr'] / Decimal(1_000_000)
        total_price = i_price + o_price + cw_price + cr_price
        
        # force decimal to string conversion, with 5 digits of precision
        six_zeros = Decimal('0.000000')
        usage = {
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'cache_write_tokens': cache_write_tokens,
            'cache_read_tokens': cache_read_tokens,
            'input_price_usd': str(i_price.quantize(six_zeros)),
            'output_price_usd': str(o_price.quantize(six_zeros)),
            'cache_write_price_usd': str(cw_price.quantize(six_zeros)),
            'cache_read_price_usd': str(cr_price.quantize(six_zeros)),
            'total_price_usd': str(total_price.quantize(six_zeros)),
        }
        return usage

    def finalize(self):
        '''
        Example response:
        {
            'model': 'model_name',
            'usage': {
                'input_tokens': 1234,
                'output_tokens': 1234,
                'input_price_usd': '0.000000',
                'output_price_usd': '0.000000',
                'total_price_usd': '0.000000',
            }
        }
        '''
        usage = self.compute_price()
        return {'model': self.model_name, 'usage': usage}


class FileStreamer:
    def __init__(self, fname: str) -> None:
        self.fname = fname
        fname.parent.mkdir(parents=True, exist_ok=True)
    
    def write(self, data: str) -> None:
        with open(self.fname, 'a') as f:
            f.write(data)


class AnthropicModel(BaseModel):
    models = {
        # https://www.anthropic.com/pricing#anthropic-api
        'claude-3-haiku': {
            'name': 'claude-3-haiku-20240307',
            'price': {
                'i': Decimal('0.25'),
                'o': Decimal('1.25'),
                'cw': Decimal('0.30'), # cache write
                'cr': Decimal('0.03'), # cache read
            },
            'context': 200_000,
        },
        'claude-3.5-haiku': {
            'name': 'claude-3-5-haiku-latest',
            'price': {
                'i': Decimal('0.80'),
                'o': Decimal('4.00'),
                'cw': Decimal('1.25'), # cache write
                'cr': Decimal('0.10'), # cache read
            },
            'context': 200_000,
        },
        'claude-3.5-sonnet': {
            'name': 'claude-3-5-sonnet-latest',
            'price': {
                'i': Decimal('3.00'),
                'o': Decimal('15.00'),
                'cw': Decimal('3.75'), # cache write
                'cr': Decimal('0.30'), # cache read
            },
            'context': 200_000,
        },
        'claude-3-opus': {
            'name': 'claude-3-opus-latest',
            'price': {
                'i': Decimal('15.00'),
                'o': Decimal('75.00'),
                'cw': Decimal('18.75'), # cache write
                'cr': Decimal('1.50'), # cache read
            },
            'context': 200_000,
        },
    }

    def __init__(self, model_name, api_key):
        super().__init__()

        self.model_name = model_name
        self.api_key = api_key
        self.client = AsyncAnthropic(api_key=api_key)

    async def astream_chat(self, messages, system_prompt=None, temperature=None, max_tokens=None, top_k=None, top_p=None, include_raw=False):
        cfg = {}
        if system_prompt is not None:
            cfg['system'] = system_prompt
        if temperature is not None:
            cfg['temperature'] = max(0.0, min(1.0, temperature))
        if max_tokens is not None:
            cfg['max_tokens'] = max_tokens
        if top_k is not None:
            cfg['top_k'] = top_k
        if top_p is not None:
            cfg['top_p'] = top_p
        
        remote_name = self.models[self.model_name]['name']
        
        async with self.client.messages.stream(
            model=remote_name,
            messages=messages,
            **cfg,
        ) as stream:
            async for chunk in stream:
                raw_chunk = chunk.to_dict()
                norm_chunk = self.process(raw_chunk)
                if norm_chunk['delta'] == '' and not include_raw:
                    continue
                if include_raw:
                    norm_chunk['_raw'] = raw_chunk
                yield norm_chunk
        yield self.finalize()

    async def astream_chat_to(self, fname, messages, max_tokens=8000, stdout=False, **kwargs):
        stream = FileStreamer(fname)
        
        resp_text = ''
        usage = None
        async for chunk in self.astream_chat(messages, max_tokens=max_tokens, **kwargs):
            if 'usage' in chunk:
                usage = chunk['usage']
                continue
            if chunk['delta'] == '':
                continue
            if stdout:
                print(chunk['delta'], end="", flush=True)
            stream.write(chunk['delta'])
            resp_text += chunk['delta']
        
        # write final response with metadata as frontmatter
        post = frontmatter.Post(resp_text)
        post['model'] = self.model_name
        post['timestamp'] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        post['usage'] = usage
        with open(fname, 'w') as f:
            f.write(frontmatter.dumps(post))
        
        # return the response text
        return resp_text, usage

    def process(self, chunk) -> str:
        '''
        {
            "delta": {
                "text": "Here's",
                "type": "text_delta"
            },
            "index": 0,
            "type": "content_block_delta"
        }

        {
            "type": "message_stop",
            "message": {
                "id": "msg_01HEK4B93mFKv5qQrtsRHhfA",
                "content": [
                    {
                        "text": "Here's a short joke...",
                        "type": "text"
                    }
                ],
                "model": "claude-3-5-sonnet-20240620",
                "role": "assistant",
                "stop_reason": "end_turn",
                "stop_sequence": null,
                "type": "message",
                "usage": {
                    "input_tokens": 15,
                    "output_tokens": 37
                }
            }
        }                
        '''
        if chunk['type'] == 'content_block_delta':
            delta = chunk['delta']['text']
        else:
            delta = ''
        
        norm_chunk = {
            'delta': delta
        }

        if chunk['type'] == 'message_stop':
            self.set_usage(
                cache_write_tokens=chunk['message']['usage'].get('cache_creation_input_tokens', 0),
                cache_read_tokens=chunk['message']['usage'].get('cache_read_input_tokens', 0),
                input_tokens=chunk['message']['usage']['input_tokens'],
                output_tokens=chunk['message']['usage']['output_tokens'],                
            )
        return norm_chunk


def add_usage(usage1, usage2):
    """
    Combines usage statistics from two API calls, adding up tokens and prices.
    
    Args:
        usage1 (dict): First usage dictionary
        usage2 (dict): Second usage dictionary
        
    Returns:
        dict: Combined usage statistics
    """
    combined = {}
    
    # Add token counts
    token_fields = ['input_tokens', 'output_tokens', 'cache_write_tokens', 'cache_read_tokens']
    for field in token_fields:
        combined[field] = usage1.get(field, 0) + usage2.get(field, 0)
    
    # Add prices (converting from string back to Decimal for precision)
    price_fields = ['input_price_usd', 'output_price_usd', 'cache_write_price_usd', 
                   'cache_read_price_usd', 'total_price_usd']
    for field in price_fields:
        price1 = Decimal(usage1.get(field, '0.000000'))
        price2 = Decimal(usage2.get(field, '0.000000'))
        combined[field] = str((price1 + price2).quantize(Decimal('0.000000')))
    
    return combined
