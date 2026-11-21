"""Small, parameterised raw SQL repository. No ORM is used."""
import json
import sqlite3
from contextlib import contextmanager
from urllib.parse import unquote, urlparse

import pymysql

from .config import get_settings


@contextmanager
def connection():
    url = get_settings().database_url
    mysql = url.startswith('mysql://')
    if mysql:
        parsed = urlparse(url)
        conn = pymysql.connect(
            host=parsed.hostname or 'localhost', port=parsed.port or 3306,
            user=unquote(parsed.username or ''), password=unquote(parsed.password or ''),
            database=parsed.path.lstrip('/'), charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
        )
    else:
        if not url.startswith('sqlite:///'):
            raise ValueError('DATABASE_URL must start with mysql:// or sqlite:///')
        conn = sqlite3.connect(url.removeprefix('sqlite:///'), timeout=20)
        conn.row_factory = sqlite3.Row
    try:
        yield conn, mysql
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def initialise():
    # JSON documents keep the evolving skill/plan schema portable. Every mutation
    # takes a row lock on MySQL (or SQLite's write lock), preventing lost updates.
    with connection() as (conn, mysql):
        cursor = conn.cursor()
        payload_type = 'LONGTEXT' if mysql else 'TEXT'
        cursor.execute(f'CREATE TABLE IF NOT EXISTS workspaces (id VARCHAR(64) PRIMARY KEY, payload {payload_type} NOT NULL)')


def read_workspace(workspace_id: str):
    with connection() as (conn, mysql):
        cursor = conn.cursor()
        cursor.execute('SELECT payload FROM workspaces WHERE id = ' + ('%s' if mysql else '?'), (workspace_id,))
        row = cursor.fetchone()
        return json.loads(row['payload']) if row else None


def create_workspace(workspace_id: str, data: dict):
    with connection() as (conn, mysql):
        cursor = conn.cursor()
        values = '%s, %s' if mysql else '?, ?'
        cursor.execute(f'INSERT INTO workspaces (id, payload) VALUES ({values})', (workspace_id, json.dumps(data)))


def mutate_workspace(workspace_id: str, change):
    with connection() as (conn, mysql):
        if not mysql:
            conn.execute('BEGIN IMMEDIATE')
        cursor = conn.cursor()
        placeholder = '%s' if mysql else '?'
        cursor.execute(f'SELECT payload FROM workspaces WHERE id = {placeholder}' + (' FOR UPDATE' if mysql else ''), (workspace_id,))
        row = cursor.fetchone()
        if not row:
            return None
        data = json.loads(row['payload'])
        change(data)
        cursor.execute(f'UPDATE workspaces SET payload = {placeholder} WHERE id = {placeholder}', (json.dumps(data), workspace_id))
        return data
