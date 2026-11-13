// Web (et iOS) : pas de widget. Sur Android, c'est sync.android.tsx qui est pris.
import type { WidgetSnapshot } from './model';

export async function syncWidget(_snap: WidgetSnapshot): Promise<void> {}
