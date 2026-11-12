package expo.modules.reveil

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/** L'heure d'un réveil est arrivée : on prépare le suivant puis on lance la sonnerie. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_FIRE) return
    val id = intent.getStringExtra(EXTRA_ID) ?: return
    val spec = AlarmStore.find(context, id) ?: return
    if (spec.once) {
      AlarmStore.remove(context, id)
      AlarmStore.addFired(context, id)
    } else {
      Scheduler.scheduleOne(context, spec)
    }
    val ring = Intent(context, RingService::class.java)
      .putExtra(EXTRA_ID, spec.id)
      .putExtra(EXTRA_TITLE, spec.title)
      .putExtra(EXTRA_SOUND, spec.sound)
    ContextCompat.startForegroundService(context, ring)
  }
}

/** Redémarrage du téléphone, mise à jour de l'appli, changement d'heure : on reprogramme tout. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Scheduler.rescheduleAll(context)
  }
}
