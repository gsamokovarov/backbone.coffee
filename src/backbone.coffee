do (root = this) ->
  # Initial Setup
  # -------------

  # Save the previous value of the `Backbone` variable, so that it can be
  # restored later on, if `noConflict` is used.
  previousBackbone = root.Backbone

  # Create a local reference to array methods.
  push = Array::push
  slice = Array::slice
  splice = Array::splice

  # The top-level namespace. All public Backbone classes and modules will
  # be attached to this. Exported for both CommonJS and the browser.
  Backbone = if exports? then exports else root.Backbone = {}

  # Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '0.9.10'

  # Require Underscore, if we're on the server, and it's not already present.
  _ = root._
  _ = require('underscore') if not _? and require?

  # For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  Backbone.$ = root.jQuery || root.Zepto || root.ender

  # Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  # to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = ->
    root.Backbone = previousBackbone
    @

  # Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  # will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  # set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false

  # Turn on `emulateJSON` to support legacy servers that can't deal with direct
  # `application/json` requests ... will encode the body as
  # `application/x-www-form-urlencoded` instead and will send the model in a
  # form param named `model`.
  Backbone.emulateJSON = false

  # Backbone.Events
  # ---------------

  # Regular expression used to split event strings.
  eventSplitter = /\s+/

  # Implement fancy features of the Events API such as multiple event
  # names `"change blur"` and jQuery-style event maps `{change: action}`
  # in terms of the existing API.
  eventsApi = (obj, action, name, rest) ->
    return true unless name
    if typeof name is 'object'
      for key, value of name
        obj[action].apply obj, [key, value].concat(rest)
    else if eventSplitter.test name
      names = name.split(eventSplitter)
      for name in names
        obj[action].apply obj, [name].concat(rest)
    else
      true

  # Optimized internal dispatch function for triggering events. Tries to
  # keep the usual cases speedy (most Backbone events have 3 arguments).
  triggerEvents = (events, args) ->
    [a1, a2, a3] = args
    switch args.length
      when 0
        event.callback.call(event.ctx) for event in events
        return
      when 1
        event.callback.call(event.ctx, a1) for event in events
        return
      when 2
        event.callback.call(event.ctx, a1, a2) for event in events
        return
      when 3
        event.callback.call(event.ctx, a1, a2, a3) for event in events
        return
      else
        event.callback.apply(event.ctx, args) for event in events

  # A module that can be mixed in to *any object* in order to provide it with
  # custom events. You may bind with `on` or remove with `off` callback
  # functions to an event `trigger`-ing an event fires all callbacks in
  # succession.
  #
  #     var object = {}
  #     _.extend(object, Backbone.Events)
  #     object.on('expand', function(){ alert('expanded') })
  #     object.trigger('expand')
  #
  Events = Backbone.Events =

    # Bind one or more space separated events, or an events map,
    # to a `callback` function. Passing `"all"` will bind the callback to
    # all events fired.
    on: (name, callback, context) ->
      return @ if !eventsApi(@, 'on', name, [callback, context]) or !callback
      @_events ||= {}
      (@_events[name] ||= []).push
        callback: callback
        context: context
        ctx: context || @
      @

    # Bind events to only be triggered a single time. After the first time
    # the callback is invoked, it will be removed.
    once: (name, callback, context) ->
      return @ if !eventsApi(@, 'once', name, [callback, context]) or !callback
      self = @
      once = _.once ->
        self.off name, once
        callback.apply @, arguments
      once._callback = callback
      @on name, once, context

    # Remove one or many callbacks. If `context` is null, removes all
    # callbacks with that function. If `callback` is null, removes all
    # callbacks for the event. If `name` is null, removes all bound
    # callbacks for all events.
    off: (name, callback, context) ->
      return @ if !@_events or !eventsApi @, 'off', name, [callback, context]
      if !name and !callback and !context
        @_events = {}
        return @

      names = if name then [name] else _.keys @_events
      for name in names
        if events = @_events[name]
          @_events[name] = retain = []
          if callback || context
            for ev in events
              if ((callback and callback isnt ev.callback and
                                callback isnt ev.callback._callback) or
                  (context and context isnt ev.context))
                retain.push ev
          delete @_events[name] unless retain.length

    # Trigger one or many events, firing all bound callbacks. Callbacks are
    # passed the same arguments as `trigger` is, apart from the event name
    # (unless you're listening on `"all"`, which will cause your callback to
    # receive the true name of the event as the first argument).
    trigger: (name) ->
      return @ unless @_events
      args = arguments[1..]
      return @ unless eventsApi @, 'trigger', name, args
      events = @_events[name]
      allEvents = @_events.all
      triggerEvents(events, args) if events
      triggerEvents allEvents, arguments if allEvents
      @

    # Tell this object to stop listening to either specific events ... or
    # to every object it's currently listening to.
    stopListening: (obj, name, callback) ->
      listeners = @_listeners
      return @ unless listeners
      deleteListener = !name and !callback
      callback = @ if typeof name is 'object'
      (listeners = {})[obj._listenerId] = obj if obj
      for id of listeners
        listeners[id].off(name, callback, @)
        delete @_listeners[id] if deleteListener
      @

  listenMethods = listenTo: 'on', listenToOnce: 'once'

  # An inversion-of-control versions of `on` and `once`. Tell *this* object to listen to
  # an event in another object ... keeping track of what it's listening to.
  _.each listenMethods, (implementation, method) ->
    Events[method] = (obj, name, callback) ->
      listeners = @_listeners ||= {}
      id = obj._listenerId ||= _.uniqueId 'l'
      listeners[id] = obj
      callback = @ if typeof name is 'object'
      obj[implementation] name, callback, this
      @
