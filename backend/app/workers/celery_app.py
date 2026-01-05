from celery import Celery
from app.core.config import settings

# Create Celery instance
celery_app = Celery(
    "sms_control_tower",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.message_tasks",
        "app.workers.webhook_tasks",
        "app.workers.campaign_tasks",
        "app.workers.analytics_tasks",
        "app.workers.compliance_tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    
    # Retry settings
    task_default_retry_delay=60,
    task_max_retries=3,
    
    # Rate limiting
    task_default_rate_limit='100/m',
    
    # Task routes
    task_routes={
        'app.workers.message_tasks.*': {'queue': 'messages'},
        'app.workers.webhook_tasks.*': {'queue': 'webhooks'},
        'app.workers.campaign_tasks.*': {'queue': 'campaigns'},
        'app.workers.analytics_tasks.*': {'queue': 'analytics'},
        'app.workers.compliance_tasks.*': {'queue': 'compliance'},
    },
    
    # Beat scheduler settings (for periodic tasks)
    beat_schedule={
        'process_scheduled_campaigns': {
            'task': 'app.workers.campaign_tasks.process_scheduled_campaigns',
            'schedule': 60.0,  # Every minute
        },
        'update_message_statuses': {
            'task': 'app.workers.message_tasks.update_pending_message_statuses',
            'schedule': 300.0,  # Every 5 minutes
        },
        'cleanup_old_audit_events': {
            'task': 'app.workers.compliance_tasks.cleanup_old_audit_events',
            'schedule': 86400.0,  # Daily
        },
        'calculate_phone_health_scores': {
            'task': 'app.workers.analytics_tasks.calculate_phone_health_scores',
            'schedule': 3600.0,  # Hourly
        },
        'generate_daily_reports': {
            'task': 'app.workers.analytics_tasks.generate_daily_reports',
            'schedule': {
                'hour': 1,
                'minute': 0
            },  # Daily at 1 AM
        }
    }
)

# Autodiscover tasks
celery_app.autodiscover_tasks()

if __name__ == '__main__':
    celery_app.start()