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
  _ = root._ or require? 'underscore'

  # For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  Backbone.$ = root.jQuery or root.Zepto or root.ender

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
      false
    else if eventSplitter.test name
      for name in name.split eventSplitter
        obj[action].apply obj, [name].concat(rest)
      false
    else
      true

  # Optimized internal dispatch function for triggering events. Tries to
  # keep the usual cases speedy (most Backbone events have 3 arguments).
  triggerEvents = (events, args) ->
    [a1, a2, a3] = args
    switch args.length
      when 0 then ev.callback.call ev.ctx for ev in events
      when 1 then ev.callback.call ev.ctx, a1 for ev in events
      when 2 then ev.callback.call ev.ctx, a1, a2 for ev in events
      when 3 then ev.callback.call ev.ctx, a1, a2, a3 for ev in events
      else ev.callback.apply ev.ctx, args for ev in events

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
      events = @_events[name] ||= []
      events.push callback: callback, context: context, ctx: context or @
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
          if callback or context
            for ev in events
              if ((callback and callback isnt ev.callback and
                                callback isnt ev.callback._callback) or
                  (context and context isnt ev.context))
                retain.push ev
          delete @_events[name] unless retain.length
      @

    # Trigger one or many events, firing all bound callbacks. Callbacks are
    # passed the same arguments as `trigger` is, apart from the event name
    # (unless you're listening on `"all"`, which will cause your callback to
    # receive the true name of the event as the first argument).
    trigger: (name) ->
      return @ unless @_events
      args = slice.call arguments, 1
      return @ unless eventsApi @, 'trigger', name, args
      events = @_events[name]
      allEvents = @_events.all
      triggerEvents events, args if events
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

  # An inversion-of-control versions of `on` and `once`. Tell *this* object to
  # listen to an event in another object ... keeping track of what it's
  # listening to.
  _.each listenMethods, (implementation, method) ->
    Events[method] = (obj, name, callback) ->
      listeners = @_listeners ||= {}
      id = obj._listenerId ||= _.uniqueId 'l'
      listeners[id] = obj
      callback = @ if typeof name is 'object'
      obj[implementation] name, callback, @
      @

  # Aliases for backwards compatibility.
  Events.bind   = Events.on
  Events.unbind = Events.off

  # Allow the `Backbone` object to serve as a global event bus, for folks who
  # want global "pubsub" in a convenient place.
  _.extend Backbone, Events

  # Backbone.Model
  # --------------

  # Create a new model, with defined attributes. A client id (`cid`)
  # is automatically generated and assigned for you.
  Model = class Backbone.Model

    constructor: (attributes, options) ->
      attrs = attributes || {}
      @cid = _.uniqueId 'c'
      @attributes = {}
      @collection = options.collection if options?.collection
      attrs = @parse(attrs, options) || {} if options?.parse
      if defaults = _.result @, 'defaults'
        attrs = _.defaults {}, attrs, defaults
      @set attrs, options
      @changed = {}
      @initialize.apply @, arguments

    _.extend @::, Events

    # A hash of attributes whose current and previous value differ.
    changed: null

    # The value returned during the last failed validation.
    validationError: null

    # The default name for the JSON `id` attribute is `"id"`. MongoDB and
    # CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id'

    # Initialize is an empty function by default. Override it with your own
    # initialization logic.
    initialize: ->

    # Return a copy of the model's `attributes` object.
    toJSON: (options) ->
      _.clone @attributes

    # Proxy `Backbone.sync` by default.
    sync: ->
      Backbone.sync.apply @, arguments

    # Get the value of an attribute.
    get: (attr) ->
      @attributes[attr]

    # Get the HTML-escaped value of an attribute.
    escape: (attr) ->
      _.escape @get(attr)

    # Returns `true` if the attribute contains a value that is not null
    # or undefined.
    has: (attr) ->
      @get(attr)?

    # Set a hash of model attributes on the object, firing `"change"` unless
    # you choose to silence it.
    set: (key, val, options = {}) ->
      return @ unless key?

      # Handle both `"key", value` and `{key: value}` -style arguments.
      if typeof key is 'object'
        [attrs, options] = [key, val]
      else
        (attrs = {})[key] = val

      # Run validation.
      return false unless @_validate attrs, options

      # Extract attributes and options.
      unset      = options.unset
      silent     = options.silent
      changes    = []
      changing   = @_changing
      @_changing = true

      unless changing
        @_previousAttributes = _.clone @attributes
        @changed = {}
      [current, prev] = [@attributes, @_previousAttributes]

      # Check for changes of `id`.
      @id = attrs[@idAttribute] if @idAttribute in attrs

      # For each `set` attribute, update or delete the current value.
      for attr, val of attrs
        changes.push attr unless _.isEqual current[attr], val
        if _.isEqual prev[attr], val
          delete @changed[attr]
        else
          @changed[attr] = val
        if unset
          delete current[attr]
        else
          current[attr] = val

      # Trigger all relevant attribute changes.
      unless !silent
        @_pending = true if changes.length
        for change in changes
          @trigger "change:#{change}", @, current[change], options

      return @ if changing
      unless silent
        while @_pending
          @_pending = false
          @trigger 'change', @, options

      @_pending  = false
      @_changing = false
      @

    # Remove an attribute from the model, firing `"change"` unless you choose
    # to silence it. `unset` is a noop if the attribute doesn't exist.
    unset: (attr, options) ->
      @set attr, undefined, _.extend({}, options, unset: true)

    # Clear all attributes on the model, firing `"change"` unless you choose
    # to silence it.
    clear: (options) ->
      @set attrs, _.extend({}, options, unset: true)

    # Determine if the model has changed since the last `"change"` event.
    # If you specify an attribute name, determine if that attribute has changed.
    hasChanged: (attr) ->
      if attr? then _.has @changed, attr else !@isEmpty @changed

    # Return an object containing all the attributes that have changed, or
    # false if there are no changed attributes. Useful for determining what
    # parts of a view need to be updated and/or what attributes need to be
    # persisted to the server. Unset attributes will be set to undefined.
    # You can also pass an attributes object to diff against the model,
    # determining if there *would be* a change.
    changedAttributes: (diff) ->
      unless diff
        return if @hasChanged() then _.clone @changed else false
      changed = false
      old = if @_changing then @_previousAttributes else @attributes
      for attr, val of diff
        continue if _.isEqual old[attr], val
        (changed ||= {})[attr] = val
      changed

    # Get the previous value of an attribute, recorded at the time the last
    # `"change"` event was fired.
    previous: (attr) ->
      return null unless attr? and @_previousAttributes
      @_previousAttributes[attr]

    # Get all of the attributes of the model at the time of the previous
    # `"change"` event.
    previousAttributes: ->
      _.clone @_previousAttributes

    # Fetch the model from the server. If the server's representation of the
    # model differs from its current attributes, they will be overriden,
    # triggering a `"change"` event.
    fetch: (options) ->
      options = if options? then _.clone options else {}
      options.parse = true if options.parse is undefined
      success = options.success
      options.success = (resp) =>
        return false unless @set @parse(resp, options), options
        success? @, resp, options
        @trigger 'sync', @, resp, options
      wrapError @this, options
      @sync 'read', @, options

  # Helpers
  # -------

  # Helper function to correctly set up the prototype chain, for subclasses.
  # Similar to `goog.inherits`, but uses a hash of prototype properties and
  # class properties to be extended.
  extend = (protoProps, staticProps) ->
    class Type extends @
      @extend: extend
    _.extend Type, staticProps
    _.extend Type::, protoProps
    new Type

  # Set up inheritance for the model, collection, router, view and history.
  Model.extend = extend

  # Throw an error when a URL is needed, and none is supplied.
  urlError = ->
    throw new Error 'A "url" property or function must be specified'

  # Wrap an optional error callback with a fallback error event.
  wrapError = (model, options) ->
    error = options.error
    options.error = (resp) ->
      error model, resp, options if error
