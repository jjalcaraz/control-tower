from supabase import create_client, Client
from app.core.config import settings
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import functools


class SupabaseClient:
    _client: Optional[Client] = None
    _executor: ThreadPoolExecutor = ThreadPoolExecutor(max_workers=10)

    @classmethod
    def get_client(cls) -> Client:
        """Get Supabase client instance (singleton)"""
        if cls._client is None:
            cls._client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE
            )
        return cls._client

    @classmethod
    async def execute_async(cls, func, *args, **kwargs):
        """Execute synchronous Supabase operations asynchronously"""
        client = cls.get_client()
        loop = asyncio.get_event_loop()
        
        # Bind the client to the function
        bound_func = functools.partial(func, client, *args, **kwargs)
        
        # Execute in thread pool
        return await loop.run_in_executor(cls._executor, bound_func)


# Convenience functions for common Supabase operations
async def supabase_select(table: str, select: str = "*", **filters):
    """Async wrapper for Supabase select operations"""
    def _select(client: Client, table: str, select: str, **filters):
        query = client.table(table).select(select)
        for key, value in filters.items():
            query = query.eq(key, value)
        return query.execute()
    
    return await SupabaseClient.execute_async(_select, table, select, **filters)


async def supabase_insert(table: str, data: dict):
    """Async wrapper for Supabase insert operations"""
    def _insert(client: Client, table: str, data: dict):
        return client.table(table).insert(data).execute()
    
    return await SupabaseClient.execute_async(_insert, table, data)


async def supabase_update(table: str, data: dict, **filters):
    """Async wrapper for Supabase update operations"""
    def _update(client: Client, table: str, data: dict, **filters):
        query = client.table(table).update(data)
        for key, value in filters.items():
            query = query.eq(key, value)
        return query.execute()
    
    return await SupabaseClient.execute_async(_update, table, data, **filters)


async def supabase_delete(table: str, **filters):
    """Async wrapper for Supabase delete operations"""
    def _delete(client: Client, table: str, **filters):
        query = client.table(table).delete()
        for key, value in filters.items():
            query = query.eq(key, value)
        return query.execute()
    
    return await SupabaseClient.execute_async(_delete, table, **filters)


async def supabase_rpc(function_name: str, params: dict):
    """Async wrapper for Supabase RPC calls"""
    def _rpc(client: Client, function_name: str, params: dict):
        return client.rpc(function_name, params).execute()
    
    return await SupabaseClient.execute_async(_rpc, function_name, params)