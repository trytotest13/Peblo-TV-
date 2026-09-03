"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-09-03
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="editor"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # shows
    op.create_table(
        "shows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(100), unique=True, index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("synopsis", sa.String(1000), nullable=True),
        sa.Column("section", sa.String(20), nullable=False, index=True),
        sa.Column("categories", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # seasons
    op.create_table(
        "seasons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("show_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("shows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("season_number", sa.Integer, nullable=False),
        sa.Column("title", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_seasons_show_id", "seasons", ["show_id"])
    op.create_unique_constraint("uq_seasons_show_number", "seasons", ["show_id", "season_number"])

    # episodes
    op.create_table(
        "episodes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("season_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slug", sa.String(150), unique=True, index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("synopsis", sa.String(2000), nullable=True),
        sa.Column("episode_number", sa.Integer, nullable=False),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("language", sa.String(5), nullable=False, index=True),
        sa.Column("content_group", sa.String(150), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_episode_content_group_language", "episodes", ["content_group", "language"])

    # artwork
    op.create_table(
        "artwork",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("show_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("shows.id", ondelete="CASCADE"), nullable=True),
        sa.Column("episode_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("episodes.id", ondelete="CASCADE"), nullable=True),
        sa.Column("artwork_type", sa.String(20), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("width_px", sa.Integer, nullable=True),
        sa.Column("height_px", sa.Integer, nullable=True),
        sa.Column("file_size_kb", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_artwork_show_id", "artwork", ["show_id"])
    op.create_index("ix_artwork_episode_id", "artwork", ["episode_id"])

    # publish_runs
    op.create_table(
        "publish_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("initiated_by", sa.String(255), nullable=False),
        sa.Column("shows_published", sa.Integer, server_default="0"),
        sa.Column("episodes_published", sa.Integer, server_default="0"),
        sa.Column("outcome", sa.String(20), nullable=False),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("publish_runs")
    op.drop_table("artwork")
    op.drop_table("episodes")
    op.drop_table("seasons")
    op.drop_table("shows")
    op.drop_table("users")
