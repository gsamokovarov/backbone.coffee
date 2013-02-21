var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

(function(root) {
  var Backbone, Events, Model, eventSplitter, eventsApi, extend, listenMethods, previousBackbone, push, slice, splice, triggerEvents, urlError, wrapError, _;
  previousBackbone = root.Backbone;
  push = Array.prototype.push;
  slice = Array.prototype.slice;
  splice = Array.prototype.splice;
  Backbone = typeof exports !== "undefined" && exports !== null ? exports : root.Backbone = {};
  Backbone.VERSION = '0.9.10';
  _ = root._ || (typeof require === "function" ? require('underscore') : void 0);
  Backbone.$ = root.jQuery || root.Zepto || root.ender;
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };
  Backbone.emulateHTTP = false;
  Backbone.emulateJSON = false;
  eventSplitter = /\s+/;
  eventsApi = function(obj, action, name, rest) {
    var key, names, value, _i, _len, _results, _results1;
    if (!name) {
      return true;
    }
    if (typeof name === 'object') {
      _results = [];
      for (key in name) {
        value = name[key];
        _results.push(obj[action].apply(obj, [key, value].concat(rest)));
      }
      return _results;
    } else if (eventSplitter.test(name)) {
      names = name.split(eventSplitter);
      _results1 = [];
      for (_i = 0, _len = names.length; _i < _len; _i++) {
        name = names[_i];
        _results1.push(obj[action].apply(obj, [name].concat(rest)));
      }
      return _results1;
    } else {
      return true;
    }
  };
  triggerEvents = function(events, args) {
    var a1, a2, a3, event, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _results;
    a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0:
        for (_i = 0, _len = events.length; _i < _len; _i++) {
          event = events[_i];
          event.callback.call(event.ctx);
        }
        break;
      case 1:
        for (_j = 0, _len1 = events.length; _j < _len1; _j++) {
          event = events[_j];
          event.callback.call(event.ctx, a1);
        }
        break;
      case 2:
        for (_k = 0, _len2 = events.length; _k < _len2; _k++) {
          event = events[_k];
          event.callback.call(event.ctx, a1, a2);
        }
        break;
      case 3:
        for (_l = 0, _len3 = events.length; _l < _len3; _l++) {
          event = events[_l];
          event.callback.call(event.ctx, a1, a2, a3);
        }
        break;
      default:
        _results = [];
        for (_m = 0, _len4 = events.length; _m < _len4; _m++) {
          event = events[_m];
          _results.push(event.callback.apply(event.ctx, args));
        }
        return _results;
    }
  };
  Events = Backbone.Events = {
    on: function(name, callback, context) {
      var _base;
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) {
        return this;
      }
      ((_base = (this._events || (this._events = {})))[name] || (_base[name] = [])).push({
        callback: callback,
        context: context,
        ctx: context || this
      });
      return this;
    },
    once: function(name, callback, context) {
      var once, self;
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) {
        return this;
      }
      self = this;
      once = _.once(function() {
        self.off(name, once);
        return callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },
    off: function(name, callback, context) {
      var ev, events, names, retain, _i, _j, _len, _len1, _results;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) {
        return this;
      }
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }
      names = name ? [name] : _.keys(this._events);
      _results = [];
      for (_i = 0, _len = names.length; _i < _len; _i++) {
        name = names[_i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (_j = 0, _len1 = events.length; _j < _len1; _j++) {
              ev = events[_j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) || (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) {
            _results.push(delete this._events[name]);
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    trigger: function(name) {
      var allEvents, args, events;
      if (!this._events) {
        return this;
      }
      args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) {
        return this;
      }
      events = this._events[name];
      allEvents = this._events.all;
      if (events) {
        triggerEvents(events, args);
      }
      if (allEvents) {
        triggerEvents(allEvents, arguments);
      }
      return this;
    },
    stopListening: function(obj, name, callback) {
      var deleteListener, id, listeners;
      listeners = this._listeners;
      if (!listeners) {
        return this;
      }
      deleteListener = !name && !callback;
      if (typeof name === 'object') {
        callback = this;
      }
      if (obj) {
        (listeners = {})[obj._listenerId] = obj;
      }
      for (id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) {
          delete this._listeners[id];
        }
      }
      return this;
    }
  };
  listenMethods = {
    listenTo: 'on',
    listenToOnce: 'once'
  };
  _.each(listenMethods, function(implementation, method) {
    return Events[method] = function(obj, name, callback) {
      var id, listeners;
      listeners = this._listeners || (this._listeners = {});
      id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') {
        callback = this;
      }
      obj[implementation](name, callback, this);
      return this;
    };
  });
  Events.bind = Events.on;
  Events.unbind = Events.off;
  _.extend(Backbone, Events);
  Model = Backbone.Model = (function() {

    _.extend(Model.prototype, Events);

    function Model(attributes, options) {
      var attrs, defaults;
      attrs = attributes || {};
      this.cid = _.uniqueId('c');
      this.attributes = {};
      if (options != null ? options.collection : void 0) {
        this.collection = options.collection;
      }
      if (options != null ? options.parse : void 0) {
        attrs = this.parse(attrs, options) || {};
      }
      if (defaults = _.result(this, 'defaults')) {
        attrs = _.defaults({}, attrs, defaults);
      }
      this.set(attrs, options);
      this.changed = {};
      this.initialize.apply(this, arguments);
    }

    Model.prototype.changed = null;

    Model.prototype.validationError = null;

    Model.prototype.idAttribute = 'id';

    Model.prototype.initialize = function() {};

    Model.prototype.toJSON = function(options) {
      return _.clone(this.attributes);
    };

    Model.prototype.sync = function() {
      return Backbone.sync.apply(this, arguments);
    };

    Model.prototype.get = function(attr) {
      return this.attributes[attr];
    };

    Model.prototype.escape = function(attr) {
      return _.escape(this.get(attr));
    };

    Model.prototype.has = function(attr) {
      return this.get(attr) != null;
    };

    return Model;

  })();
  extend = function(protoProps, staticProps) {
    var Type;
    Type = (function(_super) {

      __extends(Type, _super);

      function Type() {
        return Type.__super__.constructor.apply(this, arguments);
      }

      Type.extend = extend;

      return Type;

    })(this);
    _.extend(Type, staticProps);
    _.extend(Type.prototype, protoProps);
    return new Type;
  };
  Model.extend = extend;
  urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };
  return wrapError = function(model, options) {
    var error;
    error = options.error;
    return options.error = function(resp) {
      if (error) {
        return error(model, resp, options);
      }
    };
  };
})(this);
