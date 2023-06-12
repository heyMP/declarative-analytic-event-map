document.addEventListener('click', eddlEventHandler)
document.addEventListener('overlay-change', eddlEventHandler)

// create a batch of events keyed by type
let messageQueue = new Map();

function eddlEventHandler(e) {
  // if there is already an event of this type in the queue then we'll debounce it.
  if (messageQueue.has(e.type)) return;

  const attributes = extractAnalyticAttributesFromEvent(e);

  // let's re-map this event as a new type of event
  if (attributes.has('data-analytics-event-map')) {
    const [eventSource, eventMap] = attributes.get('data-analytics-event-map').split(':') ?? [];
    if (e.type === eventSource) {
      messageQueue.set(eventMap, { type: e.type, attributes });
    }
    else {
      if (!messageQueue.has(e.type)) {
        messageQueue.set(e.type, { type: e.type, attributes });
      }
    }
  }
  else {
    if (!messageQueue.has(e.type)) {
      messageQueue.set(e.type, { type: e.type, attributes });
    }
  }

  requestAnimationFrame(() => {
    if (messageQueue.size > 0) {
      // pull current queue
      const queue = messageQueue.entries();
      // create a fresh queue
      messageQueue = new Map();
      for (let [_, item] of queue) {
        log(item);
      }
    }
  });
}

/**
  * Takes an event listener event and traveres the event path
  * to collect all of the data-analytic attributes, starting at
  * the root of the document and ending at the event target.
  *
  * If there are duplicate attributes then the attributes closest
  * to the event target wins.
  */
function extractAnalyticAttributesFromEvent(event) {
  const attributes = new Map();
  for (const item of event.composedPath().reverse()) {
    if (!!item.hasAttributes?.()) {
      for (const attr of item.attributes) {
        if (attr.name.startsWith('data-analytics')) {
          attributes.set(attr.name, attr.value);
        }
        // if this item has an attribute for data-map then
        // grab the data that was specified in the attributes
        // and add it to the map
        if (attr.name === 'data-analytics-data-map') {
          const [eventType, dataNames] = attr.value.split(':') ?? [];
          // ensure that the eventType declared on the attributes
          // is this event type
          if (eventType === event.type) {
            // the name of the data properties are specified as a
            // comma separated list
            for (let name of dataNames.split(',')) {
              attributes.set(name, event[name]);
            }
          }
        }
      }
    }
  }
  return attributes;
}

function replacer(key, value) {
  if(value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

function log(output) {
  console.log(output);
  const pre = document.querySelector('#log pre');
  pre.insertAdjacentHTML('afterbegin', `
${JSON.stringify(output, replacer, ' ')}
`)
}
