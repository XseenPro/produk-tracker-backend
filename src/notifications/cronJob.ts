import cron from 'node-cron';
import { cleanupOldNotifications } from './notif.service';

cron.schedule('0 0 * * *', async () => {
  console.log('Running cleanup for old notifications...');
  await cleanupOldNotifications();
});
