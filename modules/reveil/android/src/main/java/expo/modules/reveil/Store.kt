package expo.modules.reveil

import android.content.Context
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject

/** Son par défaut si rien n'est choisi ou si le son choisi est illisible. */
const val DEFAULT_SOUND = "app:douceur"
const val ACTION_FIRE = "expo.modules.reveil.FIRE"
const val ACTION_STOP = "expo.modules.reveil.STOP"
const val EXTRA_ID = "id"
const val EXTRA_TITLE = "title"
const val EXTRA_SOUND = "sound"

/**
 * Un réveil tel que l'appli l'envoie. `days` : jours de la semaine, 0 = lundi … 6 = dimanche
 * (même convention que les routines). Liste vide = une seule fois, à la prochaine heure indiquée.
 */
data class WakeSpec(
  val id: String,
  val hour: Int,
  val minute: Int,
  val days: List<Int>,
  val title: String,
  val sound: String,
) {
  val once: Boolean get() = days.isEmpty()

  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
    .put("hour", hour)
    .put("minute", minute)
    .put("days", JSONArray(days))
    .put("title", title)
    .put("sound", sound)

  companion object {
    fun fromJson(o: JSONObject): WakeSpec {
      val d = o.optJSONArray("days") ?: JSONArray()
      return WakeSpec(
        id = o.getString("id"),
        hour = o.getInt("hour"),
        minute = o.getInt("minute"),
        days = (0 until d.length()).map { d.getInt(it) },
        title = o.optString("title", "Réveil").ifBlank { "Réveil" },
        sound = o.optString("sound", DEFAULT_SOUND).ifBlank { DEFAULT_SOUND },
      )
    }

    fun listFromJson(raw: String?): List<WakeSpec> {
      if (raw.isNullOrBlank()) return emptyList()
      return try {
        val arr = JSONArray(raw)
        (0 until arr.length()).mapNotNull { i ->
          try { fromJson(arr.getJSONObject(i)) } catch (e: Exception) { null }
        }
      } catch (e: Exception) {
        emptyList()
      }
    }
  }
}

/**
 * Copie des réveils côté Android : le téléphone doit pouvoir reprogrammer le prochain réveil
 * (après une sonnerie, un redémarrage, un changement d'heure) sans que l'appli soit ouverte.
 */
object AlarmStore {
  private const val PREFS = "cerveau_externe_reveil"
  private const val KEY_ALARMS = "alarms"
  private const val KEY_FIRED = "fired"

  private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized
  fun load(c: Context): List<WakeSpec> = WakeSpec.listFromJson(prefs(c).getString(KEY_ALARMS, null))

  @Synchronized
  fun save(c: Context, list: List<WakeSpec>) {
    val arr = JSONArray()
    list.forEach { arr.put(it.toJson()) }
    prefs(c).edit().putString(KEY_ALARMS, arr.toString()).apply()
  }

  @Synchronized
  fun find(c: Context, id: String): WakeSpec? = load(c).firstOrNull { it.id == id }

  @Synchronized
  fun remove(c: Context, id: String) = save(c, load(c).filter { it.id != id })

  /** Réveils « une fois » qui ont sonné : l'appli les éteint à sa prochaine ouverture. */
  @Synchronized
  fun addFired(c: Context, id: String) {
    val arr = JSONArray(prefs(c).getString(KEY_FIRED, "[]"))
    arr.put(id)
    prefs(c).edit().putString(KEY_FIRED, arr.toString()).apply()
  }

  @Synchronized
  fun consumeFired(c: Context): List<String> {
    val arr = JSONArray(prefs(c).getString(KEY_FIRED, "[]"))
    prefs(c).edit().putString(KEY_FIRED, "[]").apply()
    return (0 until arr.length()).map { arr.getString(it) }
  }
}

/** Sons : « app:<nom> » = son intégré (res/raw/reveil_<nom>.wav), « uri:<adresse> » = sonnerie du téléphone. */
object Sounds {
  fun uri(c: Context, sound: String): Uri? {
    if (sound.startsWith("app:")) {
      val res = c.resources.getIdentifier("reveil_" + sound.removePrefix("app:"), "raw", c.packageName)
      return if (res != 0) Uri.parse("android.resource://${c.packageName}/$res") else null
    }
    if (sound.startsWith("uri:")) return Uri.parse(sound.removePrefix("uri:"))
    return null
  }
}
