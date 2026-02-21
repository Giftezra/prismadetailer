# Generated migration - remove tip_amount from Earning

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0004_remove_chat_models'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='earning',
            name='tip_amount',
        ),
    ]
