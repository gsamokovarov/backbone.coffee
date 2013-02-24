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
      attrs = attributes or {}
      @cid = _.uniqueId 'c'
      @attributes = {}
      @collection = options.collection if options?.collection
      attrs = @parse(attrs, options) or {} if options?.parse
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
    set: (key, val, options) ->
      return @ unless key?

      # Handle both `"key", value` and `{key: value}` -style arguments.
      if typeof key is 'object'
        [attrs, options] = [key, val]
      else
        (attrs = {})[key] = val

      options ||= {}

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
      @id = attrs[@idAttribute] if _.has attrs, @idAttribute

      # For each `set` attribute, update or delete the current value.
      for attr, val of attrs
        changes.push attr unless _.isEqual current[attr], val
        if _.isEqual prev[attr], val then delete @changed[attr] else @changed[attr] = val
        if unset then delete current[attr] else current[attr] = val

      # Trigger all relevant attribute changes.
      unless silent
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
      attrs = {}
      attrs[key] = undefined for key of @attributes
      @set attrs, _.extend({}, options, unset: true)

    # Determine if the model has changed since the last `"change"` event.
    # If you specify an attribute name, determine if that attribute has changed.
    hasChanged: (attr) ->
      if attr? then _.has @changed, attr else !_.isEmpty @changed

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
      wrapError @, options
      @sync 'read', @, options

    # Set a hash of model attributes, and sync the model to the server.
    # If the server returns an attributes hash that differs, the model's
    # state will be `set` again.
    save: (key, val, options = {}) ->
      attributes = @attributes

      # Handle both `"key", value` and `{key: value}` -style arguments.
      if !key? or typeof key is 'object'
        [attrs, options] = [key, val]
      else
        (attrs = {})[key] = val

      # If we're not waiting and attributes exist, save acts as `set(attr).save(null, opts)`.
      if attrs and !options?.wait and !@set attrs, options
        return false

      options = _.extend {validate: true}, options

      # Do not persist invalid models.
      return false unless @_validate attrs, options

      # Set temporary attributes if `{wait: true}`.
      if attrs and options.wait
        @attributes = _.extend {}, attributes, attrs

      # After a successful server-side save, the client is (optionally)
      # updated with the server-side state.
      options.parse = true if options.parse is undefined
      success = options.success
      options.success = (resp) =>
        # Ensure attributes are restored during synchronous saves.
        @attributes = attributes
        serverAttrs = @parse resp, options
        serverAttrs = _.extend(attrs || {}, serverAttrs) if options.wait
        if _.isObject(serverAttrs) and !@set(serverAttrs, options)
          return false
        success? @, resp, options
        @trigger 'sync', @, resp, options

      wrapError @, options

      method = if @isNew() then 'create' else if options.patch then 'patch' else 'update'
      options.attrs = attrs if method is 'patch'
      xhr = @sync method, @, options

      # Restore attributes.
      @attributes = attributes if attrs and options.wait

      xhr

    # Destroy this model on the server if it was already persisted.
    # Optimistically removes the model from its collection, if it has one.
    # If `wait: true` is passed, waits for the server to respond before removal.
    destroy: (options) ->
      options = if options? then _.clone options else {}
      success = options.success
      destroy = => @trigger 'destroy', @, @collection, options

      options.success = (resp) =>
        destroy() if options.wait or @isNew()
        success? @, resp, options
        @trigger 'sync', @, resp, options unless @isNew()

      if @isNew()
        options.success()
        return false
      wrapError @, options

      xhr = @sync 'delete', @, options
      destroy unless options.wait
      xhr

    # Default URL for the model's representation on the server -- if you're
    # using Backbone's restful methods, override this to change the endpoint
    # that will be called.
    url: ->
      base = _.result(@, 'urlRoot') or _.result(@collection, 'url') or urlError()
      return base if @isNew()
      base + (if base.charAt(base.length - 1) is '/' then '' else '/') + encodeURIComponent(@id)

    # **parse** converts a response into the hash of attributes to be `set` on
    # the model. The default implementation is just to pass the response along.
    parse: (resp, options) ->
      resp

    # Create a new model with identical attributes to this one.
    clone: ->
      new @constructor @attributes

    # A model is new if it has never been saved to the server, and lacks an id.
    isNew: ->
      !@id?

    # Check if the model is currently in a valid state.
    isValid: (options) ->
      !@validate? @attributes, options

    # Run validation against the next complete set of model attributes,
    # returning `true` if all is well. Otherwise, fire an
    # `"invalid"` event and call the invalid callback, if specified.
    _validate: (attrs, options) ->
      return true unless options?.validate and @validate?
      attrs = _.extend {}, @attributes, attrs
      error = @validationError = @validate(attrs, options) || null
      return true unless error
      @trigger 'invalid', @, error, (options || {})
      false

  # Backbone.Collection
  # -------------------

  # Provides a standard collection class for our sets of models, ordered
  # or unordered. If a `comparator` is specified, the Collection will maintain
  # its models in sort order, as they're added and removed.
  Collection = class Backbone.Collection

    constructor: (models, options = {}) ->
      @model = options.model if options.model
      comparator = options.comparator if options.comparator isnt undefined
      @_reset()
      @initialize?.apply @, arguments
      @reset? models, _.extend({silent: true}, options) if models

    _.extend @::, Events

    # The default model for a collection is just a **Backbone.Model**.
    # This should be overridden in most cases.
    model: Model

    # Initialize is an empty function by default. Override it with your own
    # initialization logic.
    initialize: ->

    # The JSON representation of a Collection is an array of the
    # models' attributes.
    toJSON: (options) ->
      @map (model) -> model.toJSON options

    # Proxy `Backbone.sync` by default.
    sync: ->
      Backbone.sync.apply @, arguments

    # Add a model, or list of models to the set.
    add: (models, options) ->
      for model in [].concat(models)
        model.collection = @
        @models.push model

    # Reset all internal state. Called when the collection is reset.
    _reset: ->
      @length = 0
      @models = []
      @_byId  = {}

  # Backbone.sync
  # -------------

  # Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  methodMap =
    create: 'POST'
    update: 'PUT'
    patch:  'PATCH'
    delete: 'DELETE'
    read:   'GET'

  # Override this function to change the manner in which Backbone persists
  # models to the server. You will be passed the type of request, and the
  # model in question. By default, makes a RESTful Ajax request
  # to the model's `url()`. Some possible customizations could be:
  #
  # * Use `setTimeout` to batch rapid-fire updates into a single request.
  # * Send up the models as XML instead of JSON.
  # * Persist models via WebSockets instead of Ajax.
  #
  # Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  # as `POST`, with a `_method` parameter containing the true HTTP method,
  # as well as all requests with the body as `application/x-www-form-urlencoded`
  # instead of `application/json` with the model in a param named `model`.
  # Useful when interfacing with server-side languages like **PHP** that make
  # it difficult to read the body of `PUT` requests.
  Backbone.sync = (method, model, options = {}) ->
    type = methodMap[method]

    # Default options, unless specified.
    _.defaults options,
      emulateHTTP: Backbone.emulateHTTP
      emulateJSON: Backbone.emulateJSON

    # Default JSON-request options.
    params = type: type, dataType: 'json'

    # Ensure that we have a URL.
    unless options.url
      params.url = _.result(model, 'url') or urlError()

    # Ensure that we have the appropriate request data.
    if !options.data? and model and (method is 'create' or method is 'update' or method is 'patch')
      params.contentType = 'application/json'
      params.data = JSON.stringify(options.attrs or model.toJSON(options))

    # For older servers, emulate JSON by encoding the request into an HTML-form.
    if options.emulateJSON
      params.contentType = 'application/x-www-form-urlencoded'
      params.data = if params.data then model: params.data else {}

    # For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    # And an `X-HTTP-Method-Override` header.
    if options.emulateHTTP and (type is 'PUT' or type is 'DELETE' or type is 'PATCH')
      params.type = 'POST'
      params.data._method = type if options.emulateJSON
      beforeSend = options.beforeSend
      options.beforeSend = (xhr) ->
        xhr.setRequestHeader 'X-HTTP-Method-Override', type
        return beforeSend.apply @, arguments if beforeSend

    # Don't process data on a non-GET request.
    unless params.type is 'GET' or options.emulateJSON
      params.processData = false

    # Make the request, allowing the user to override any Ajax options.
    xhr = options.xhr = Backbone.ajax _.extend(params, options)
    model.trigger 'request', model, xhr, options
    xhr

  # Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  Backbone.ajax = ->
    Backbone.$.ajax.apply Backbone.$, arguments

  # Helpers
  # -------

  # Helper function to correctly set up the prototype chain, for subclasses.
  # Similar to `goog.inherits`, but uses a hash of prototype properties and
  # class properties to be extended.
  extend = (protoProps, staticProps) ->
    class Type extends @
      _.extend @, staticProps
      _.extend @::, protoProps
      @extend: extend

  # Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = extend

  # Throw an error when a URL is needed, and none is supplied.
  urlError = ->
    throw new Error 'A "url" property or function must be specified'

  # Wrap an optional error callback with a fallback error event.
  wrapError = (model, options) ->
    error = options.error
    options.error = (resp) ->
      error model, resp, options if error
