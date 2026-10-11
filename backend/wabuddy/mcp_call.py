"""Small stdio MCP client for host-driven rehearsals, without another WA connector."""
import argparse
import asyncio
import base64
import json
from pathlib import Path
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def call(account, name, arguments):
    params=StdioServerParameters(command=sys.executable,args=['-m','wabuddy.live_mcp','--account',account])
    async with stdio_client(params) as (read,write):
        async with ClientSession(read,write) as session:
            await session.initialize()
            result=await session.call_tool(name,arguments)
            if result.isError:
                raise ValueError('\n'.join(c.text for c in result.content if c.type=='text'))
            return result


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('tool')
    parser.add_argument('--account',default='default')
    parser.add_argument('--args',type=Path)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    result=asyncio.run(call(args.account,args.tool,json.loads(args.args.read_text(encoding='utf-8-sig')) if args.args else {}))
    for content in result.content:
        if content.type=='text':
            if args.output:
                args.output.parent.mkdir(parents=True,exist_ok=True)
                args.output.write_text(content.text,encoding='utf-8')
                print('Saved MCP result.')
            else:
                print(content.text)
        elif content.type=='image':
            if not args.output:
                raise ValueError('Supply --output to save the image for inspection.')
            args.output.parent.mkdir(parents=True,exist_ok=True)
            args.output.write_bytes(base64.b64decode(content.data))
            print('Saved MCP image for inspection.')


if __name__=='__main__':
    main()
