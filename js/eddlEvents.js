export class EddlManager extends EventTarget {
  constructor() {
    super();
    // create a batch of events keyed by type
    this._messageQueue = new Map();
    this._listners = new Set();
    this._eventListnerHandler = this.eddlEventHandler.bind(this);
    this.initializeEventListener('click');
  }

  initializeEventListener(eventname) {
    if (!this._listners.has(eventname)) {
      document.addEventListener(eventname, this._eventListnerHandler);
      this._listners.add(eventname);
    }
  }

  eddlEventHandler(e) {
    // if there is already an event of this type in the queue then we'll debounce it.
    if (this._messageQueue.has(e.type)) return;

    const attributes = extractAnalyticAttributesFromEvent(e);
    let type = e.type;

    // let's re-map this event as a new type of event
    if (attributes.has('data-analytics-event-map')) {
      const [eventSource, eventMap] = attributes.get('data-analytics-event-map').split(':') ?? [];
      if (e.type === eventSource) {
        type = eventMap;
      }
    }

    this._messageQueue.set(type, { type: e.type, tagName: e.target.tagName, attributes });

    // using requestAnimationFrame allows us to allow DOM events to bulk collect
    // so that we can dudupe the click events from the delarative data-analytics-event-map
    // events.
    requestAnimationFrame(() => {
      if (this._messageQueue.size > 0) {
        // pull current queue
        const queue = this._messageQueue.entries();
        // create a fresh queue
        this._messageQueue = new Map();
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
