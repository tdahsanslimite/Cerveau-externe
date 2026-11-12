package expo.modules.reveil

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

/** Programme chaque réveil à sa prochaine heure avec AlarmManager.setAlarmClock (le mode « réveil » d'Android). */
object Scheduler {
  /** Prochaine sonnerie strictement après `now` (ms), ou -1. Jours : 0 = lundi … 6 = dimanche. */
  fun nextTrigger(spec: WakeSpec, now: Long): Long {
    val cal = Calendar.getInstance()
    cal.timeInMillis = now
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    cal.set(Calendar.HOUR_OF_DAY, spec.hour)
    cal.set(Calendar.MINUTE, spec.minute)
    for (i in 0..7) {
      if (i > 0) {
        cal.add(Calendar.DAY_OF_MONTH, 1)
        cal.set(Calendar.HOUR_OF_DAY, spec.hour)
        cal.set(Calendar.MINUTE, spec.minute)
      }
      val day = (cal.get(Calendar.DAY_OF_WEEK) + 5) % 7
      if (cal.timeInMillis > now && (spec.days.isEmpty() || spec.days.contains(day))) return cal.timeInMillis
    }
    return -1
  }

  private fun fireIntent(c: Context, id: String): PendingIntent {
    val intent = Intent(c, AlarmReceiver::class.java).setAction(ACTION_FIRE).putExtra(EXTRA_ID, id)
    return PendingIntent.getBroadcast(
      c, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun showIntent(c: Context): PendingIntent? {
    val launch = c.packageManager.getLaunchIntentForPackage(c.packageName) ?: return null
    return PendingIntent.getActivity(c, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun canExact(c: Context): Boolean {
    val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()
  }

  /** Programme la prochaine sonnerie de ce réveil. Renvoie l'heure programmée (ms) ou -1. */
  fun scheduleOne(c: Context, spec: WakeSpec): Long {
    val at = nextTrigger(spec, System.currentTimeMillis())
    if (at < 0) return -1
    val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = fireIntent(c, spec.id)
    try {
      if (canExact(c)) {
        am.setAlarmClock(AlarmManager.AlarmClockInfo(at, showIntent(c)), pi)
      } else {
        // Sans l'autorisation « alarmes exactes », Android peut décaler de quelques minutes.
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
      }
    } catch (e: SecurityException) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
    }
    return at
  }

  fun cancel(c: Context, id: String) {
    val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.cancel(fireIntent(c, id))
  }

  /** Remplace tous les réveils par cette liste (réveils actifs seulement). */
  fun applyAll(c: Context, list: List<WakeSpec>) {
    val keep = list.map { it.id }.toSet()
    AlarmStore.load(c).filter { it.id !in keep }.forEach { cancel(c, it.id) }
    AlarmStore.save(c, list)
    list.forEach { scheduleOne(c, it) }
  }

  fun rescheduleAll(c: Context) {
    AlarmStore.load(c).forEach { scheduleOne(c, it) }
  }
}
