import type { PropCutInDefinition, PropCutInId } from "@supaluv/content";

/**
 * EN display copy for prop cut-ins. Captions use task-brief fixed strings where
 * provided; accessible text is full translation of zh source (no fact add/drop).
 */
const PROP_EN: Readonly<
  Record<PropCutInId, { readonly title: string; readonly accessibleText: string; readonly altText: string }>
> = {
  "prop-protocol-terms": {
    title: "Emotional Authenticity Test Protocol · Page 3",
    accessibleText:
      "Emotional Authenticity Test Protocol, page 3, data-handling notice. 03.1 Product emotional authenticity depends on the user’s genuine disclosure. 03.2 During the test, data is used for model iteration. 03.3 After the test, original recordings are automatically cleared; “cleared” is bold. Terms continue in Appendix A.",
    altText:
      "Cold white page three of a protocol pressed on a black test desk; three small lines state genuine disclosure, model iteration, and automatic clearing of original recordings, with “cleared” bolded on a black bar; no character dialogue or spoiler labels on the paper.",
  },
  "prop-barcode-shift": {
    title: "Huiwanjia Night Shift · Barcodes & Orders",
    accessibleText:
      "Huiwanjia POS terminal and thermal barcode tape. Forty items in one minute; the screen shows 01:00 / 40 items. Dense order rows include quantity, unit price, subtotal, and status. Practice anchors: near-expiry spicy sticks scanned beep; iced black tea scanned beep; bucket instant noodles scanned beep. Interruptions for scanner cutouts, worn barcodes rescanned, and refusals. Stock is piled up—don’t play with the system.",
    altText:
      "Worn POS screen and thermal barcode strip in a cheap mini-market: dense lines of product name, barcode, quantity, price, and status; three practice anchors are near-expiry spicy sticks, iced black tea, and bucket instant noodles; red scan line and physical grime are visible.",
  },
  "prop-rental-receipt": {
    title: "Rent Receipt · ¥900",
    accessibleText:
      "Receipt, rent / deposit. Received nine hundred yuan rent deposit. Amount: ¥900, nine hundred. Move-in terms: (1) nine hundred, pay by the 5th; (2) no emoji in the notes field; (3) don’t bring weird people into the building—you own any trouble. Signed by the collector. Handwriting looks like a hospital prescription.",
    altText:
      "A wrinkled thermal rent receipt angled on a cheap wood table; blue handwriting like a hospital script; amount “¥900” largest; below: pay by the 5th; notes ban emoji; weird people stay out of the building. Stage notes outside the paper are not printed facts.",
  },
  "prop-application-nda": {
    title: "Verified reviewer application & NDA",
    accessibleText:
      "Verified reviewer application / 01. Apply to become a verified reviewer. Full-time live-in tester for a physical device. Fivefold subsidy. Housing condition: private room. Form fields: neighbor tolerance (average / good / excellent / prefer not to rate); mind highly humanlike devices (mind / don’t mind / unsure). Read and agreed. Next: Super NDA. Super NDA. Project: full-time live-in device test. Conditions: private room / Super NDA. Article 7: the device’s existence must not be known to any non-signer, including housemates. Penalty: leading digits hidden, five zeros remain.",
    altText:
      "Left: cheap phone showing a full-time home tester application with fivefold subsidy and private-room checkbox; questionnaire lists labels and options with no selected answers. Right: overly formal black-frame Super NDA with article 7 reverse-bolded and a penalty of five visible zeros.",
  },
  "prop-approval-sms": {
    title: "System notice · Initial review passed",
    accessibleText:
      "23:43, SMS, system notice. Initial review passed. Three minutes later. Initial review passed. Complete the personalized matching questionnaire within 48 hours. 48 hours. System notice. SMS body only contains the review result and questionnaire deadline.",
    altText:
      "Phone on a cheap rental bed; corporate SMS UI with overly friendly pink corners, checkmark, and confetti announces “Initial review passed”; body asks for a personalized matching questionnaire within 48 hours. Outer stage notes are not part of the SMS body.",
  },
  "prop-coat-sms": {
    title: "Chen Jia · coat pickup",
    accessibleText:
      "WeChat-style SMS screenshot; cracked phone on a convenience-store counter. Contact: Chen Jia. 20:41 from her: I left a coat there—when is convenient for me to pick it up. Su Ming 20:43: Sure, I’m at the shop all evening.",
    altText:
      "Cracked phone screen on a worn counter; chat with Chen Jia; two blue bubbles about picking up a coat and that tonight is urgent; no human faces.",
  },
  "prop-activation-confirm": {
    title: "Heartbeat Engine · Activation Confirmation",
    accessibleText:
      "Heartbeat Engine · Activation Confirmation. Model: HEARTBEAT-X / fitness mannequin kit. Term: verified-reviewer test period 90 days. Binding: long-press the nape for seven seconds to complete binding. Footer: binding counts as voluntary; definition of voluntary is in §7.3. Agreement ID TE-03-7S.",
    altText:
      "Creased activation confirmation form on a cheap wood table; bold line says long-press the nape for seven seconds to bind; packing foam scraps nearby; no people in frame.",
  },
};

export function localizePropCutIn(
  definition: PropCutInDefinition,
  locale: string,
): PropCutInDefinition {
  if (!locale.startsWith("en")) {
    return definition;
  }
  const en = PROP_EN[definition.id];
  if (!en) {
    return definition;
  }
  return {
    ...definition,
    title: en.title,
    accessibleText: en.accessibleText,
    altText: en.altText,
  };
}
