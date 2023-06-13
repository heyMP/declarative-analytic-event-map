# Declarative Data Analytics

![](/assets/diagram.svg)

Traditional data analytics are collected by adding data attributes to
call to links with information about what type of user interaction should
be recorded when the link is clicked. For instance, if a CTA is clicked, it
will have attributes such at `data-analytics-category`, `data-analytics-text`,
`data-analytics-linktype`, a global event listener will catch that click event
and scrape the analytic data attributes.  A challenge is that design components
and native html elements don't always use a click event to communicate a user
interaction. If we wanted to track if the user opened navigation dropdowns in
the secondary navigation we would need to write imperative code that looks something like this.

```js
document.addEventListener('overlay-change', e => {
  const submnav = e.composedPath().find(i => id === "subnav");
  const attributes = e.toggle.attributes;
  recordAnalyticEvent('subnav-open', { open: e.open, attributes })
});
```

The challenge is that this could result in lots of imperative code that needs to
change often based on what components are being used accross sites as well as imperetive logic
that might need to record the events differently from page to page.
