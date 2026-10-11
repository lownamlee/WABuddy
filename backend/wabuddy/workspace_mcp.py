"""Stdio MCP for the shared preview workspace. No connector or sending access."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

from .workspace import WorkspaceStore


class PlannedTask(BaseModel):
    id: str = Field(min_length=1, max_length=60)
    title: str = Field(min_length=1, max_length=300)
    role: Literal['Coordinator', 'Conversation agent', 'Order agent', 'Knowledge agent', 'Verifier']
    kind: Literal['Agent', 'Tool']
    depends: list[str] = Field(default_factory=list, max_length=30)


def validate_plan(tasks: list[PlannedTask]):
    if not 1 <= len(tasks) <= 30: raise ValueError('Use 1–30 tasks.')
    ids = {task.id for task in tasks}
    if len(ids) != len(tasks): raise ValueError('Task IDs must be unique.')
    visited = set()
    while len(visited) < len(tasks):
        ready = {t.id for t in tasks if t.id not in visited and set(t.depends) <= visited}
        if not ready: raise ValueError('Dependencies contain a cycle or unknown task ID.')
        visited.update(ready)


def create_server(root: Path, account: str) -> FastMCP:
    store = WorkspaceStore(root / 'workspace.sqlite3')
    server = FastMCP('WABuddy workspace', instructions='Shared fictional UI workspace. No live WhatsApp access, AI execution, automatic sending or scheduler. Never report a planned agent as executed.')

    @server.tool()
    def get_workspace_context() -> dict:
        """Read the account-scoped preview state and revision shared with the website."""
        return {'account_id': account, 'mode': 'preview', **store.get(account)}

    @server.tool()
    def get_capabilities() -> dict:
        """Read actual runtime boundaries before planning or reporting completion."""
        return {'mode': 'preview', 'shared_state': True, 'verified_xlsx_export': True,
                'persist_goal_plans': True, 'live_message_access': False,
                'live_sending': False, 'scheduler': False, 'subagent_runtime': False}

    @server.tool()
    def create_goal_plan(goal: str, kind: Literal['orders','inbox','knowledge','automation','clarify'], scope: str,
                         tasks: list[PlannedTask], expected_revision: int) -> dict:
        """Persist an agent-proposed dependency graph; does not execute its tasks."""
        if not goal.strip() or len(goal) > 2000 or len(scope) > 100: raise ValueError('Invalid goal or scope.')
        validate_plan(tasks)
        current = store.get(account)
        state = current['state']
        if state is None: raise ValueError('Open the dashboard to initialise the sample workspace.')
        run = {'id': str(uuid4()), 'goal': goal, 'kind': kind, 'range': scope, 'attachments': [],
               'status': 'Planning', 'created': datetime.now(timezone.utc).isoformat(),
               'events': ['Plan proposed through MCP. No agents executed.'],
               'steps': [{**t.model_dump(), 'status':'Queued','detail':''} for t in tasks]}
        state['runs'].insert(0, run)
        saved = store.save(account, expected_revision, state)
        return {**saved, 'run': run}

    @server.tool()
    def get_run(run_id: str) -> dict:
        """Inspect a persisted plan, preview progress and its evidence."""
        state = store.get(account)['state'] or {}
        for run in state.get('runs', []):
            if run['id'] == run_id: return {'mode':'preview', 'run':run}
        raise ValueError('Run not found in this account.')

    @server.tool()
    def list_outcomes() -> dict:
        """List generated sample report snapshots and unresolved items."""
        state = store.get(account)['state'] or {}
        return {'mode':'preview', 'reports':state.get('reports',[]),
                'needs_attention':[t for t in state.get('threads',[]) if not t['resolved']]}

    @server.tool()
    def generate_order_report(scope: str, expected_revision: int) -> dict:
        """Generate, reopen and validate a real XLSX from fictional workspace orders."""
        if scope != 'All sample dates':
            from datetime import date
            date.fromisoformat(scope)
        result = store.report(account, expected_revision, scope)
        folder = root / 'artifacts'; folder.mkdir(parents=True, exist_ok=True)
        target = folder / f"sample-report-{result['report']['id']}.xlsx"
        target.write_bytes(result['content'])
        return {'mode':'preview', 'verified':True, 'report_id':result['report']['id'],
                'artifact_path':str(target.resolve()), 'coverage':result['report']['coverage'],
                'sheets':['Orders','Summary','Needs Attention']}

    return server


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', type=Path, default=Path(__file__).resolve().parents[2] / '.local')
    parser.add_argument('--account', required=True, help='Explicit account ID from the WABuddy bootstrap response')
    args = parser.parse_args()
    create_server(args.data_dir, args.account).run(transport='stdio')


if __name__ == '__main__': main()
