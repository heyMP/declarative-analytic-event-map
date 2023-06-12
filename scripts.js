document.addEventListener('click', eddlEventHandler)
document.addEventListener('overlay-change', eddlEventHandler)

// create a batch of events keyed by type
let messageQueue = new Map();

function eddlEventHandler(e) {
  const path = e.composedPath();
  const [eventSource, eventMap] = e.target?.closest('[data-analytics-event-map]')?.getAttribute('data-analytics-event-map')?.split(':') ?? [];
  // let's remap this event as a new type of event
  if (eventSource) {
    if (e.type === eventSource) {
      messageQueue.set(eventMap, e);
    }
    else {
      if (!messageQueue.has(e.type)) {
        messageQueue.set(eventMap, e);
      }
    }
  }
  else {
    if (!messageQueue.has(e.type)) {
      messageQueue.set(eventMap, e);
    }
  }

  requestAnimationFrame(() => {
    if (messageQueue.size > 0) {
      // pull current queue
      const queue = messageQueue.values();
      // create a fresh queue
      messageQueue = new Map();
      for (let event of queue) {
        console.log(extractAnalyticsFromEvent(event));
      }
    }
  });
}

function extractAnalyticsFromEvent(event) {
  const region = event.closest('[data-analytics-region]')?.getAttribute('data-analytics-region');
  const text = event.closest('[data-analytics-text]')?.getAttribute('data-analytics-text');
  const category = event.closest('[data-analytics-category]')?.getAttribute('data-analytics-category');
  const dataMap = extractDataMapFromEvent(event);
  return { region, text, category, ...dataMap }
}

function extractDataMapFromEvent(event) {
  const dataMap = event.closest('[data-analytics-category]')?.getAttribute('data-analytics-category');
}







