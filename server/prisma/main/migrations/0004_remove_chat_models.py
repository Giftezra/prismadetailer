# Generated migration - remove chat models

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0003_jobactivitylog_and_more'),
    ]

    operations = [
        migrations.DeleteModel(name='JobChatMessage'),
        migrations.DeleteModel(name='JobChatRoom'),
    ]
