import techSideJson from './techSide.json';
import { siteLinks, getMailtoHref } from './siteLinks';
import type { TechPackage, EquipmentSpec, GalleryItem, TechSideData } from '../schemas/techSide';
import type { LocalizedText } from '../schemas/common';

export type { TechPackage, EquipmentSpec, GalleryItem, TechSideData, LocalizedText };

const techData = techSideJson as TechSideData;

export const techPackages: TechPackage[] = techData.techPackages;
export const equipmentBreakdown: EquipmentSpec[] = techData.equipmentBreakdown;
export const techGallery: GalleryItem[] = techData.techGallery;

export function getPrefilledMailto(locale: 'it' | 'en', packageName?: string): string {
  const email = siteLinks.email;
  const pkgText = packageName ? ` (${packageName})` : '';

  if (locale === 'it') {
    const subject = 'Richiesta Preventivo Service - [Nome Evento]';
    const body =
`Ciao Luca,

Vorrei richiedere un preventivo per il seguente evento${pkgText}:

- Tipo di evento (privato, festa, open-air, aziendale):
- Data e orari indicativi:
- Location (città, indoor/outdoor):
- Numero previsto di persone:
- Pacchetto di interesse (Audio + Luci, Solo Audio, Solo Casse, Solo Console, Altro): ${packageName || ''}
- Eventuali esigenze extra (monitor spia, microfoni, ecc.):

Grazie!`;
    return getMailtoHref(subject, body, email);
  }

  const subject = 'Service Quote Request - [Event Name]';
  const body =
`Hi Luca,

I would like to request a quote for the following event${pkgText}:

- Event type (private, party, open-air, corporate):
- Indicative date and times:
- Location (city, indoor/outdoor):
- Expected number of guests:
- Package of interest (Audio + Lighting, Full Audio, PA Speakers Only, DJ Console Only, Other): ${packageName || ''}
- Any extra needs (booth monitor, microphones, etc.):

Thank you!`;
  return getMailtoHref(subject, body, email);
}
