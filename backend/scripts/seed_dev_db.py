import asyncio
import json
import os
from pathlib import Path
import uuid
import sys

import asyncpg
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]

sys.path.insert(0, str(BACKEND_DIR))


def load_env() -> None:
    load_dotenv(ROOT_DIR / ".env.local")
    load_dotenv(BACKEND_DIR / ".env.local")


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        host = os.getenv("POSTGRES_HOST", "localhost")
        port = os.getenv("POSTGRES_PORT", "5432")
        db = os.getenv("POSTGRES_DB", "postgres")
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "")
        url = f"postgresql://{user}:{password}@{host}:{port}/{db}"
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return url


def template_language(content: str) -> str:
    spanish_markers = ("Hola", "Buenos", "Estimado", "Saludos")
    return "es" if any(marker in content for marker in spanish_markers) else "en"


async def seed() -> None:
    load_env()
    database_url = get_database_url()

    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured.")

    conn = await asyncpg.connect(database_url)
    try:
        await conn.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

        org_id = uuid.UUID("12345678-1234-5678-9abc-123456789012")
        user_id = uuid.UUID("12345678-1234-5678-9abc-123456789013")

        await conn.execute(
            """
            INSERT INTO organizations (
                id, name, slug, brand_name, default_timezone, compliance_settings, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                slug = EXCLUDED.slug,
                brand_name = EXCLUDED.brand_name,
                default_timezone = EXCLUDED.default_timezone,
                compliance_settings = EXCLUDED.compliance_settings,
                is_active = EXCLUDED.is_active
            """,
            org_id,
            "SMS Control Tower Demo",
            "sms-control-tower-demo",
            "Control Tower SMS",
            "America/Chicago",
            json.dumps({
                "tcpa_enabled": True,
                "auto_stop_processing": True,
                "auto_help_responses": True
            }),
            True,
        )

        await conn.execute(
            """
            INSERT INTO users (
                id, email, username, hashed_password, first_name, last_name,
                role, is_active, is_verified, organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                username = EXCLUDED.username,
                hashed_password = EXCLUDED.hashed_password,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                role = EXCLUDED.role,
                is_active = EXCLUDED.is_active,
                is_verified = EXCLUDED.is_verified,
                organization_id = EXCLUDED.organization_id
            """,
            user_id,
            "admin@controlsms.demo",
            "admin",
            "$2b$12$dummy.hashed.password.for.seed.data.only",
            "Admin",
            "User",
            "admin",
            True,
            True,
            org_id,
        )

        from app.seed_data import SPANISH_TEMPLATES

        existing = await conn.fetchval(
            "SELECT COUNT(*) FROM templates WHERE category = 'initial'"
        )
        if existing and int(existing) > 0:
            print(f"Templates already exist ({existing} initial templates found). Skipping seed.")
            return

        templates_created = 0
        for template_data in SPANISH_TEMPLATES:
            await conn.execute(
                """
                INSERT INTO templates (
                    id, organization_id, name, content, category, language,
                    required_variables, is_active, is_approved, usage_count, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                uuid.uuid4(),
                org_id,
                template_data["name"],
                template_data["content"],
                template_data["category"],
                template_language(template_data["content"]),
                json.dumps(template_data.get("variables", [])),
                True,
                True,
                0,
                user_id,
            )
            templates_created += 1

        print(f"Successfully created {templates_created} Spanish templates for landowner outreach")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
