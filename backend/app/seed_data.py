"""
Seed data for SMS Control Tower - Spanish templates for landowner outreach
"""
import asyncio
import uuid
from datetime import datetime
from app.core.database import AsyncSessionLocal
from app.models import Organization, Template, User


# Spanish templates for landowner outreach (TCPA compliant)
SPANISH_TEMPLATES = [
    # Initial contact templates
    {
        "category": "initial",
        "name": "Landowner Interest - Basic",
        "content": "Hola {first_name}, soy de Control Tower SMS. ¿Estarías interesado en vender tu propiedad en {county}? Texto ALTO para parar.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial", 
        "name": "Land Purchase Inquiry",
        "content": "Estimado {first_name}, compramos terrenos en {county}. ¿Te interesa una oferta por tu propiedad? Responde ALTO para no recibir más mensajes.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Property Investment - Polite",
        "content": "Buenas {first_name}, somos inversionistas de bienes raíces en {county}. ¿Considerarías vender tu terreno? Texto ALTO si no deseas más mensajes.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Quick Cash Offer",
        "content": "Hola {first_name}, ofrecemos pago en efectivo por terrenos en {county}. ¿Te interesa saber más? Envía ALTO para cancelar.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Local Land Buyer",
        "content": "Saludos {first_name}, compramos propiedades en {county} por dinero en efectivo. ¿Estarías interesado? Texto ALTO para parar mensajes.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Fair Market Offer",
        "content": "Buenos días {first_name}, hacemos ofertas justas por terrenos en {county}. ¿Te gustaría escuchar nuestra propuesta? ALTO para parar.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Land Development Interest",
        "content": "Hola {first_name}, buscamos terrenos en {county} para desarrollo. ¿Considerarías vender? Responde ALTO si no te interesa.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Investment Group Inquiry",
        "content": "Estimado propietario en {county}, nuestro grupo busca terrenos. ¿Estarías dispuesto a vender? Texto ALTO para no recibir mensajes.",
        "variables": ["county"]
    },
    {
        "category": "initial",
        "name": "Cash Land Purchase",
        "content": "Hola {first_name}, pagamos efectivo por propiedades en {county}. Sin comisiones ni costos. ¿Te interesa? ALTO para parar.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Simple Land Inquiry",
        "content": "Buenos días {first_name}, ¿estarías interesado en vender tu terreno en {county}? Envía ALTO si no deseas más mensajes.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Professional Land Buyer",
        "content": "Saludos {first_name}, somos compradores profesionales de terrenos en {county}. ¿Considerarías una oferta? Texto ALTO para parar.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Direct Land Purchase",
        "content": "Hola {first_name}, compramos directamente terrenos en {county}. Proceso rápido y sencillo. ¿Te interesa? ALTO para cancelar.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Land Investment Opportunity",
        "content": "Buenos días {first_name}, invertimos en terrenos de {county}. ¿Estarías dispuesto a vender el tuyo? Responde ALTO para parar.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Quick Property Sale",
        "content": "Hola {first_name}, facilitamos ventas rápidas de terrenos en {county}. ¿Te gustaría saber más? Texto ALTO si no te interesa.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "initial",
        "name": "Serious Land Buyer",
        "content": "Estimado {first_name}, somos compradores serios de propiedades en {county}. ¿Considerarías vender? ALTO para no recibir más.",
        "variables": ["first_name", "county"]
    },
    
    # Follow-up templates
    {
        "category": "followup",
        "name": "Second Contact - Gentle",
        "content": "Hola otra vez {first_name}, ¿tuviste oportunidad de pensar en nuestra propuesta para tu terreno en {county}? ALTO para parar.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "followup",
        "name": "Follow-up Offer",
        "content": "Buenos días {first_name}, seguimos interesados en tu propiedad en {county}. ¿Te gustaría recibir una oferta? Texto ALTO para cancelar.",
        "variables": ["first_name", "county"]
    },
    {
        "category": "followup",
        "name": "Persistent but Polite",
        "content": "Hola {first_name}, espero no molestarte. ¿Hay alguna posibilidad de que vendas tu terreno en {county}? ALTO para parar mensajes.",
        "variables": ["first_name", "county"]
    },
    
    # Help responses
    {
        "category": "help",
        "name": "Help Response Spanish",
        "content": "Somos {brand}, compradores de terrenos. Para más información llama al (555) 123-4567. Texto ALTO para cancelar mensajes.",
        "variables": ["brand"]
    },
    {
        "category": "help", 
        "name": "Help Response English",
        "content": "We are {brand}, land buyers. For more info call (555) 123-4567. Text STOP to cancel messages.",
        "variables": ["brand"]
    },
    
    # Stop confirmation
    {
        "category": "stop",
        "name": "Stop Confirmation Spanish",
        "content": "Has sido removido de nuestra lista. No recibirás más mensajes de {brand}. Gracias.",
        "variables": ["brand"]
    },
    {
        "category": "stop",
        "name": "Stop Confirmation English", 
        "content": "You have been removed from our list. You will receive no more messages from {brand}. Thank you.",
        "variables": ["brand"]
    }
]


async def create_seed_data():
    """Create default organization and user"""
    async with AsyncSessionLocal() as session:
        # Use consistent UUIDs
        default_org_uuid = uuid.UUID("12345678-1234-5678-9abc-123456789012")
        default_user_uuid = uuid.UUID("12345678-1234-5678-9abc-123456789013")

        # Check if organization already exists
        from sqlalchemy import select
        org_result = await session.execute(
            select(Organization).where(Organization.id == default_org_uuid)
        )
        org = org_result.scalar_one_or_none()

        if not org:
            org = Organization(
                id=default_org_uuid,
                name="SMS Control Tower Demo",
                slug="sms-control-tower-demo",
                brand_name="Control Tower SMS",
                default_timezone="America/Chicago",
                compliance_settings={
                    "tcpa_enabled": True,
                    "auto_stop_processing": True,
                    "auto_help_responses": True
                }
            )
            session.add(org)
            await session.flush()  # Get org ID

        # Check if user already exists
        user_result = await session.execute(
            select(User).where(User.email == "admin@controlsms.demo")
        )
        user = user_result.scalar_one_or_none()

        if not user:
            # Database schema: UUID id, hashed_password, first_name, last_name, organization_id, is_verified
            user = User(
                id=default_user_uuid,  # Use UUID
                organization_id=org.id,  # Required foreign key
                email="admin@controlsms.demo",
                username="admin",
                hashed_password="$2b$12$dummy.hashed.password.for.seed.data.only",  # Column is 'hashed_password'
                first_name="Admin",  # Separate first_name column
                last_name="User",    # Separate last_name column
                role="admin",
                is_active=True,
                is_verified=True  # Has is_verified column
            )
            session.add(user)
            await session.flush()  # Get user ID

        await session.commit()
        return org, user


async def seed_spanish_templates():
    """Create Spanish templates for landowner outreach"""
    async with AsyncSessionLocal() as session:
        # Get or create default organization and user
        org, user = await create_seed_data()

        # Check if templates already exist
        from sqlalchemy import text, select
        existing = await session.execute(
            select(Template).where(Template.category == "initial")
        )
        existing_templates = existing.scalars().all()

        if existing_templates:
            print(f"Templates already exist ({len(existing_templates)} initial templates found). Skipping seed.")
            return

        # Create templates
        templates_created = 0
        for template_data in SPANISH_TEMPLATES:
            template = Template(
                id=uuid.uuid4(),
                organization_id=org.id,
                category=template_data["category"],
                name=template_data["name"],
                content=template_data["content"],
                language="es" if any(word in template_data["content"] for word in ["Hola", "Buenos", "Estimado"]) else "en",
                required_variables=template_data["variables"],
                is_active=True,
                is_approved=True,
                usage_count=0,
                created_by=user.id  # User.id is now UUID
            )
            session.add(template)
            templates_created += 1

        await session.commit()
        print(f"Successfully created {templates_created} Spanish templates for landowner outreach")


async def main():
    """Main seed function"""
    print("Starting SMS Control Tower seed data creation...")
    await seed_spanish_templates()
    print("Seed data creation completed!")


if __name__ == "__main__":
    asyncio.run(main())