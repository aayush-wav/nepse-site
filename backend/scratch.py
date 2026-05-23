import asyncio
from cache import cache
from nepse_client import nepse_client

async def main():
    floorsheet = await asyncio.to_thread(nepse_client.get_floorsheet)
    print(f'Floorsheet length: {len(floorsheet) if floorsheet else None}')
    if floorsheet and len(floorsheet) > 0:
        print('First floorsheet item:', floorsheet[0])
    
    live = await asyncio.to_thread(nepse_client.get_live_trading)
    print(f'Live length: {len(live) if live else None}')
    if live and len(live) > 0:
        print('First live item:', live[0])

asyncio.run(main())
