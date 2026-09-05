"""add authenticated show lists

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "show_list_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("show_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["show_id"], ["shows.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "show_id", name="uq_show_list_user_show"),
    )
    op.create_index("ix_show_list_items_user_id", "show_list_items", ["user_id"])
    op.create_index("ix_show_list_items_show_id", "show_list_items", ["show_id"])


def downgrade() -> None:
    op.drop_index("ix_show_list_items_show_id", table_name="show_list_items")
    op.drop_index("ix_show_list_items_user_id", table_name="show_list_items")
    op.drop_table("show_list_items")
