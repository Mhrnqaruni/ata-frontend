// Web vitals for the UI log (SOT-5): LCP, FCP, TTFB, CLS and INP from web-vitals' attribution build, as
// browser.web_vital lines with OpenTelemetry's names and what caused each value. They cover the first load only.
// Area: platform

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals/attribution';
import { fileAddress } from './pageElements.js';
import { logForView } from './pageViews.js';

// The attribution fields each metric logs: web-vitals' name → the log field.
const ATTRIBUTION = {
  LCP: {
    target: 'mst.vital.target',
    url: 'mst.vital.url',
    timeToFirstByte: 'mst.vital.time_to_first_byte',
    resourceLoadDelay: 'mst.vital.resource_load_delay',
    resourceLoadDuration: 'mst.vital.resource_load_duration',
    elementRenderDelay: 'mst.vital.element_render_delay',
  },
  INP: {
    interactionTarget: 'mst.vital.interaction_target',
    interactionType: 'mst.vital.interaction_type',
    inputDelay: 'mst.vital.input_delay',
    processingDuration: 'mst.vital.processing_duration',
    presentationDelay: 'mst.vital.presentation_delay',
  },
  CLS: { largestShiftTarget: 'mst.vital.largest_shift_target', largestShiftValue: 'mst.vital.largest_shift_value' },
  TTFB: {
    dnsDuration: 'mst.vital.dns_duration',
    connectionDuration: 'mst.vital.connection_duration',
    requestDuration: 'mst.vital.request_duration',
    waitingDuration: 'mst.vital.waiting_duration',
    cacheDuration: 'mst.vital.cache_duration',
  },
};

// Layout shift is a score, so it keeps 4 decimals. Everything else is in milliseconds.
const score = (value) => Math.round(value * 10000) / 10000;

function attributionValue(key, value) {
  if (key === 'url') return typeof value === 'string' ? fileAddress(value) : undefined;
  if (key === 'largestShiftValue') return typeof value === 'number' ? score(value) : undefined;
  return typeof value === 'number' ? Math.round(value) : value;
}

function report(metric) {
  try {
    const round = metric.name === 'CLS' ? score : Math.round;
    const fields = {
      'browser.web_vital.name': metric.name.toLowerCase(),
      'browser.web_vital.value': round(metric.value),
      'browser.web_vital.delta': round(metric.delta),
      'browser.web_vital.id': metric.id,
      'browser.web_vital.rating': metric.rating,
      'browser.web_vital.navigation_type': metric.navigationType,
    };
    for (const [key, field] of Object.entries(ATTRIBUTION[metric.name] ?? {})) {
      fields[field] = attributionValue(key, metric.attribution?.[key]);
    }
    logForView('browser.web_vital', fields); // the view open when it's reported (CLS and INP: when hidden)
  } catch {
    /* logging never breaks the page */
  }
}

// Called by installUiLog. web-vitals reads the buffered entries, so the metrics so far are still reported.
export function startWebVitals() {
  for (const on of [onCLS, onFCP, onINP, onLCP, onTTFB]) on(report);
}
