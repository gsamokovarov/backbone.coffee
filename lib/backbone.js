var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

(function(root) {
  var Backbone, Collection, Events, Model, eventSplitter, eventsApi, extend, listenMethods, previousBackbone, push, slice, splice, triggerEvents, urlError, wrapError, _;
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
    var key, value, _i, _len, _ref;
    if (!name) {
      return true;
    }
    if (typeof name === 'object') {
      for (key in name) {
        value = name[key];
        obj[action].apply(obj, [key, value].concat(rest));
      }
      return false;
    } else if (eventSplitter.test(name)) {
      _ref = name.split(eventSplitter);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        name = _ref[_i];
        obj[action].apply(obj, [name].concat(rest));
      }
      return false;
    } else {
      return true;
    }
  };
  triggerEvents = function(events, args) {
    var a1, a2, a3, ev, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _results, _results1, _results2, _results3, _results4;
    a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0:
        _results = [];
        for (_i = 0, _len = events.length; _i < _len; _i++) {
          ev = events[_i];
          _results.push(ev.callback.call(ev.ctx));
        }
        return _results;
        break;
      case 1:
        _results1 = [];
        for (_j = 0, _len1 = events.length; _j < _len1; _j++) {
          ev = events[_j];
          _results1.push(ev.callback.call(ev.ctx, a1));
        }
        return _results1;
        break;
      case 2:
        _results2 = [];
        for (_k = 0, _len2 = events.length; _k < _len2; _k++) {
          ev = events[_k];
          _results2.push(ev.callback.call(ev.ctx, a1, a2));
        }
        return _results2;
        break;
      case 3:
        _results3 = [];
        for (_l = 0, _len3 = events.length; _l < _len3; _l++) {
          ev = events[_l];
          _results3.push(ev.callback.call(ev.ctx, a1, a2, a3));
        }
        return _results3;
        break;
      default:
        _results4 = [];
        for (_m = 0, _len4 = events.length; _m < _len4; _m++) {
          ev = events[_m];
          _results4.push(ev.callback.apply(ev.ctx, args));
        }
        return _results4;
    }
  };
  Events = Backbone.Events = {
    on: function(name, callback, context) {
      var events, _base;
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) {
        return this;
      }
      this._events || (this._events = {});
      events = (_base = this._events)[name] || (_base[name] = []);
      events.push({
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
      var ev, events, names, retain, _i, _j, _len, _len1;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) {
        return this;
      }
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }
      names = name ? [name] : _.keys(this._events);
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
            delete this._events[name];
          }
        }
      }
      return this;
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

    _.extend(Model.prototype, Events);

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

    Model.prototype.set = function(key, val, options) {
      var attr, attrs, change, changes, changing, current, prev, silent, unset, _i, _len, _ref, _ref1, _ref2;
      if (key == null) {
        return this;
      }
      if (typeof key === 'object') {
        _ref = [key, val], attrs = _ref[0], options = _ref[1];
      } else {
        (attrs = {})[key] = val;
      }
      options || (options = {});
      if (!this._validate(attrs, options)) {
        return false;
      }
      unset = options.unset;
      silent = options.silent;
      changes = [];
      changing = this._changing;
      this._changing = true;
      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      _ref1 = [this.attributes, this._previousAttributes], current = _ref1[0], prev = _ref1[1];
      if (_ref2 = this.idAttribute, __indexOf.call(attrs, _ref2) >= 0) {
        this.id = attrs[this.idAttribute];
      }
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) {
          changes.push(attr);
        }
        if (_.isEqual(prev[attr], val)) {
          delete this.changed[attr];
        } else {
          this.changed[attr] = val;
        }
        if (unset) {
          delete current[attr];
        } else {
          current[attr] = val;
        }
      }
      if (!!silent) {
        if (changes.length) {
          this._pending = true;
        }
        for (_i = 0, _len = changes.length; _i < _len; _i++) {
          change = changes[_i];
          this.trigger("change:" + change, this, current[change], options);
        }
      }
      if (changing) {
        return this;
      }
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    };

    Model.prototype.unset = function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {
        unset: true
      }));
    };

    Model.prototype.clear = function(options) {
      return this.set(attrs, _.extend({}, options, {
        unset: true
      }));
    };

    Model.prototype.hasChanged = function(attr) {
      if (attr != null) {
        return _.has(this.changed, attr);
      } else {
        return !this.isEmpty(this.changed);
      }
    };

    Model.prototype.changedAttributes = function(diff) {
      var attr, changed, old, val;
      if (!diff) {
        if (this.hasChanged()) {
          return _.clone(this.changed);
        } else {
          return false;
        }
      }
      changed = false;
      old = this._changing ? this._previousAttributes : this.attributes;
      for (attr in diff) {
        val = diff[attr];
        if (_.isEqual(old[attr], val)) {
          continue;
        }
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    };

    Model.prototype.previous = function(attr) {
      if (!((attr != null) && this._previousAttributes)) {
        return null;
      }
      return this._previousAttributes[attr];
    };

    Model.prototype.previousAttributes = function() {
      return _.clone(this._previousAttributes);
    };

    Model.prototype.fetch = function(options) {
      var success,
        _this = this;
      options = options != null ? _.clone(options) : {};
      if (options.parse === void 0) {
        options.parse = true;
      }
      success = options.success;
      options.success = function(resp) {
        if (!_this.set(_this.parse(resp, options), options)) {
          return false;
        }
        if (typeof success === "function") {
          success(_this, resp, options);
        }
        return _this.trigger('sync', _this, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    };

    Model.prototype.save = function(key, val, options) {
      var attributes, attrs, method, success, xhr, _ref,
        _this = this;
      if (options == null) {
        options = {};
      }
      attributes = this.attributes;
      if (!(key != null) || typeof key === 'object') {
        _ref = [key, val], attrs = _ref[0], options = _ref[1];
      } else {
        (attrs = {})[key] = val;
      }
      if (attrs && !(options != null ? options.wait : void 0) && this.set(attrs, options)) {
        return false;
      }
      options = _.extend({
        validate: true
      }, options);
      if (!this._validate(attrs, options)) {
        return false;
      }
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }
      if (options.parse === void 0) {
        options.parse = true;
      }
      success = options.success;
      options.success = function(resp) {
        var serverAttrs;
        _this.attributes = attributes;
        serverAttrs = _this.parse(resp, options);
        if (options.wait) {
          serverAttrs = _.extend(attrs || {}, serverAttrs);
        }
        if (_.isObject(serverAttrs) && !_this.set(serverAttrs, options)) {
          return false;
        }
        if (typeof success === "function") {
          success(model, resp, options);
        }
        return _this.trigger('sync', _this, resp, options);
      };
      wrapError(this, options);
      method = this.isNew() ? 'create' : options.patch ? 'patch' : 'update';
      if (method === 'patch') {
        options.attrs = attrs;
      }
      xhr = this.sync(method, this, options);
      if (attrs && options.wait) {
        this.attributes = attributes;
      }
      return xhr;
    };

    Model.prototype.destroy = function(options) {
      var destroy, success, xhr,
        _this = this;
      options = options != null ? _.clone(options) : {};
      success = options.success;
      destroy = function() {
        return _this.trigger('destroy', _this, _this.collection, options);
      };
      options.success = function(resp) {
        if (options.wait || _this.isNew()) {
          destroy();
        }
        if (typeof success === "function") {
          success(model, resp, options);
        }
        if (!_this.isNew()) {
          return _this.trigger('sync', model, resp, options);
        }
      };
      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);
      xhr = this.sync('delete', this, options);
      destroy(uness(options.wait));
      return xhr;
    };

    Model.prototype.url = function() {
      var base;
      base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) {
        return base;
      }
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    };

    Model.prototype.parse = function(resp, options) {
      return resp;
    };

    Model.prototype.clone = function() {
      return new this.constructor(this.attributes);
    };

    Model.prototype.isNew = function() {
      return !(this.id != null);
    };

    Model.prototype.isValid = function(options) {
      return !(typeof this.validate === "function" ? this.validate(this.attributes, options) : void 0);
    };

    Model.prototype._validate = function(attrs, options) {
      var error;
      if (!(((options != null ? options.validate : void 0) != null) && (typeof validate !== "undefined" && validate !== null))) {
        return true;
      }
      attrs = _.extend({}, this.attributes, attrs);
      error = this.validationError = this.validate(attrs, options) || null;
      if (!error) {
        return true;
      }
      this.trigger('invalid', this, error, options || {});
      return false;
    };

    return Model;

  })();
  Collection = Backbone.Collection = (function() {

    function Collection(models, options) {
      var comparator, _ref;
      if (options == null) {
        options = {};
      }
      if (options.model) {
        this.model = options.model;
      }
      if (options.comparator !== void 0) {
        comparator = options.comparator;
      }
      if (typeof this._reset === "function") {
        this._reset();
      }
      if ((_ref = this.initialize) != null) {
        _ref.apply(this, arguments);
      }
      if (models) {
        if (typeof this.reset === "function") {
          this.reset(models, _.extend({
            silent: true
          }, options));
        }
      }
    }

    _.extend(Collection.prototype, Events);

    Collection.prototype.model = Model;

    Collection.prototype.initialize = function() {};

    Collection.prototype.toJSON = function(options) {
      return this.map(function(model) {
        return model.toJSON(options);
      });
    };

    Collection.prototype.sync = function() {
      return Backbone.sync.apply(this, arguments);
    };

    return Collection;

  })();
  extend = function(protoProps, staticProps) {
    var Type;
    return Type = (function(_super) {

      __extends(Type, _super);

      function Type() {
        return Type.__super__.constructor.apply(this, arguments);
      }

      _.extend(Type, staticProps);

      _.extend(Type.prototype, protoProps);

      Type.extend = extend;

      return Type;

    })(this);
  };
  Model.extend = Collection.extend = extend;
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
