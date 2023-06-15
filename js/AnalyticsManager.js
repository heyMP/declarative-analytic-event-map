export class AnalyticsManager extends EventTarget {
  constructor() {
    super();
    // create a batch of events keyed by type
    this._messageQueue = new Map();
    this._listners = new Set();
    this._eventListenerHandler = this.eventListenerHandler.bind(this);
    this.registerEventListener('click');
    this.scanEventMaps();
  }

  scanEventMaps() {
    for (const eventmap of document.querySelectorAll('[data-analytics-event-map]')) {
      const [eventname] = eventmap.getAttribute('data-analytics-event-map')?.split?.(':') ?? [];
      if (eventname) {
        this.registerEventListener(eventname);
      }
    }
  }

  registerEventListener(eventname, target = document) {
    if (!this._listners.has(eventname)) {
      target.addEventListener(eventname, this._eventListenerHandler);
      this._listners.add(eventname);
    }
  }

  eventListenerHandler(e) {
    // if there is already an event of this type in the queue then we'll debounce it.
    if (this._messageQueue.has(e.type)) return;

    this._messageQueue.set(e.type, {
      type: e.type,
      tagName: e.target.tagName,
      attributes: extractAnalyticAttributesFromEvent(e)
    });

    // using requestAnimationFrame allows DOM events to bulk collect
    // so that we can dudupe the click events from the delarative data-analytics-event-map
    // events.
    requestAnimationFrame(() => {
      if (this._messageQueue.size > 0) {
        // pull current queue
        const queue = new Map(this._messageQueue);
        // create a fresh queue
        this._messageQueue = new Map();

        // Map any events that were marked with the data-analytics-event-map attribute
        for (const [_, data] of queue) {
          const [sourceEvent, mappedEvent] = data.attributes?.get?.('data-analytics-event-map')?.split(':') ?? [];
          if (sourceEvent && mappedEvent) {
            const mappedEventData = queue.get(mappedEvent);
            if (mappedEventData) {
              // merge the source event data with the mapped event data
              queue.set(mappedEvent, { ...mappedEventData, attributes: new Map([...mappedEventData.attributes, ...data.attributes])});
              // delete the original event
              queue.delete(sourceEvent);
            }
          }
        }

        for (let [_, item] of queue) {
          this.dispatchEvent(new CustomEvent('log', {
            detail: {
              ...item
            }
          }))
        }
      }
    });
  }
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
            const dataNamesArry = dataNames.split(',');
            for (let [name, defaultValue] of dataNames.split(',').map(i => i.split('='))) {
              if (defaultValue) {
                attributes.set(name, defaultValue);
              }
              else {
                attributes.set(name, event[name]);
              }
            }
          }
        }
      }
    }
  }
  return attributes;
}
