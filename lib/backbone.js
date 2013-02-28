(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  (function(root) {
    var Backbone, Collection, Events, History, Model, Router, View, attributeMethods, delegateEventSplitter, escapeRegExp, eventSplitter, eventsApi, extend, isExplorer, listenMethods, methodMap, methods, namedParam, optionalParam, previousBackbone, push, rootStripper, routeStripper, slice, splatParam, splice, trailingSlash, triggerEvents, urlError, viewOptions, wrapError, _;
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
        if (!(eventsApi(this, 'on', name, [callback, context]) && callback)) {
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
        if (!(eventsApi(this, 'once', name, [callback, context]) && callback)) {
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
        if (!(this._events && eventsApi(this, 'off', name, [callback, context]))) {
          return this;
        }
        if (!(name || callback || context)) {
          this._events = {};
          return this;
        }
        names = name ? [name] : _.keys(this._events);
        for (_i = 0, _len = names.length; _i < _len; _i++) {
          name = names[_i];
          if (!(events = this._events[name])) {
            continue;
          }
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
        var attr, attrs, change, changes, changing, current, prev, silent, unset, _i, _len, _ref, _ref1;
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
        if (_.has(attrs, this.idAttribute)) {
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
        if (!silent) {
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
        var attrs, key;
        attrs = {};
        for (key in this.attributes) {
          attrs[key] = void 0;
        }
        return this.set(attrs, _.extend({}, options, {
          unset: true
        }));
      };

      Model.prototype.hasChanged = function(attr) {
        if (attr != null) {
          return _.has(this.changed, attr);
        } else {
          return !_.isEmpty(this.changed);
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
          if (!_.isEqual(old[attr], val)) {
            (changed || (changed = {}))[attr] = val;
          }
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
        if (attrs && !(options != null ? options.wait : void 0) && !this.set(attrs, options)) {
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
            success(_this, resp, options);
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
            success(_this, resp, options);
          }
          if (!_this.isNew()) {
            return _this.trigger('sync', _this, resp, options);
          }
        };
        if (this.isNew()) {
          options.success();
          return false;
        }
        wrapError(this, options);
        xhr = this.sync('delete', this, options);
        if (!options.wait) {
          destroy();
        }
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
        if (!((options != null ? options.validate : void 0) && (this.validate != null))) {
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
        if (options == null) {
          options = {};
        }
        if (options.model) {
          this.model = options.model;
        }
        if (options.comparator !== void 0) {
          this.comparator = options.comparator;
        }
        this._reset();
        this.initialize.apply(this, arguments);
        if (models) {
          this.reset(models, _.extend({
            silent: true
          }, options));
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

      Collection.prototype.add = function(models, options) {
        var add, at, attrs, doSort, existing, model, modelMap, remove, sort, sortAttr, _i, _j, _k, _len, _len1, _len2, _ref;
        if (options == null) {
          options = {};
        }
        models = _.isArray(models) ? models.slice() : [models];
        add = [];
        at = options.at;
        sort = this.comparator && !(at != null) && options.sort !== false;
        sortAttr = _.isString(this.comparator) ? this.comparator : null;
        modelMap = {};
        for (_i = 0, _len = models.length; _i < _len; _i++) {
          attrs = models[_i];
          if (!(model = this._prepareModel(attrs, options))) {
            continue;
          }
          if (existing = this.get(model)) {
            modelMap[existing.cid] = true;
            if (options.merge) {
              existing.set((attrs === model ? model.attributes : attrs), options);
              if (sort && !doSort && existing.hasChanged(sortAttr)) {
                doSort = true;
              }
            }
            continue;
          }
          if (options.add === false) {
            continue;
          }
          add.push(model);
          model.on('all', this._onModelEvent, this);
          this._byId[model.cid] = model;
          if (model != null) {
            this._byId[model.id] = model;
          }
        }
        if (options.remove) {
          remove = [];
          _ref = this.models;
          for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
            model = _ref[_j];
            if (!modelMap[model.cid]) {
              remove.push(model);
            }
          }
          if (remove.length) {
            this.remove(remove, options);
          }
        }
        if (add.length) {
          if (sort) {
            doSort = true;
          }
          this.length += add.length;
          if (at != null) {
            splice.apply(this.models, [at, 0].concat(add));
          } else {
            push.apply(this.models, add);
          }
        }
        if (doSort) {
          this.sort({
            silent: true
          });
        }
        if (options.silent) {
          return this;
        }
        for (_k = 0, _len2 = add.length; _k < _len2; _k++) {
          model = add[_k];
          model.trigger('add', model, this, options);
        }
        if (doSort) {
          this.trigger('sort', this, options);
        }
        return this;
      };

      Collection.prototype.remove = function(models, options) {
        var index, model, _i, _len;
        if (options == null) {
          options = {};
        }
        models = _.isArray(models) ? models.slice() : [models];
        for (_i = 0, _len = models.length; _i < _len; _i++) {
          model = models[_i];
          if (!(model = this.get(model))) {
            continue;
          }
          delete this._byId[model.id];
          delete this._byId[model.cid];
          index = this.indexOf(model);
          this.models.splice(index, 1);
          this.length--;
          if (!options.silent) {
            options.index = index;
            model.trigger('remove', model, this, options);
          }
          this._removeReference(model);
        }
        return this;
      };

      Collection.prototype.push = function(model, options) {
        model = this._prepareModel(model, options);
        this.add(model, _.extend({
          at: this.length
        }, options));
        return model;
      };

      Collection.prototype.pop = function(options) {
        var model;
        model = this.at(this.length - 1);
        this.remove(model, options);
        return model;
      };

      Collection.prototype.unshift = function(model, options) {
        model = this._prepareModel(model, options);
        this.add(model, _.extend({
          at: 0
        }, options));
        return model;
      };

      Collection.prototype.shift = function(options) {
        var model;
        model = this.at(0);
        this.remove(model, options);
        return model;
      };

      Collection.prototype.slice = function(begin, end) {
        return this.models.slice(begin, end);
      };

      Collection.prototype.get = function(obj) {
        if (obj != null) {
          return this._byId[obj.id != null ? obj.id : obj.cid || obj];
        }
      };

      Collection.prototype.at = function(index) {
        return this.models[index];
      };

      Collection.prototype.where = function(attrs, first) {
        if (_.isEmpty(attrs)) {
          if (first) {
            return void 0;
          } else {
            return [];
          }
        }
        return this[first ? 'find' : 'filter'](function(model) {
          var key;
          for (key in attrs) {
            if (attrs[key] !== model.get(key)) {
              return false;
            }
          }
          return true;
        });
      };

      Collection.prototype.findWhere = function(attrs) {
        return this.where(attrs, true);
      };

      Collection.prototype.sort = function(options) {
        if (options == null) {
          options = {};
        }
        if (!this.comparator) {
          throw new Error('Cannot sort a set without a comparator');
        }
        if (_.isString(this.comparator) || this.comparator.length === 1) {
          this.models = this.sortBy(this.comparator, this);
        } else {
          this.models.sort(_.bind(this.comparator, this));
        }
        if (!options.silent) {
          this.trigger('sort', this, options);
        }
        return this;
      };

      Collection.prototype.pluck = function(attr) {
        return _.invoke(this.models, 'get', attr);
      };

      Collection.prototype.update = function(models, options) {
        options = _.extend({
          merge: true,
          remove: true
        }, options);
        if (options.parse) {
          models = this.parse(models, options);
        }
        this.add(models, options);
        return this;
      };

      Collection.prototype.reset = function(models, options) {
        var model, _i, _len, _ref;
        options = options ? _.clone(options) : {};
        if (options.parse) {
          models = this.parse(models, options);
        }
        _ref = this.models;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          model = _ref[_i];
          this._removeReference(model);
        }
        options.previousModels = this.models;
        this._reset();
        if (models) {
          this.add(models, _.extend({
            silent: true
          }, options));
        }
        if (!options.silent) {
          this.trigger('reset', this, options);
        }
        return this;
      };

      Collection.prototype.fetch = function(options) {
        var success,
          _this = this;
        options = options ? _.clone(options) : {};
        if (options.parse === void 0) {
          options.parse = true;
        }
        success = options.success;
        options.success = function(resp) {
          _this[options.update ? 'update' : 'reset'](resp, options);
          if (typeof success === "function") {
            success(_this, resp, options);
          }
          return _this.trigger('sync', _this, resp, options);
        };
        wrapError(this, options);
        return this.sync('read', this, options);
      };

      Collection.prototype.create = function(model, options) {
        var success,
          _this = this;
        options = options ? _.clone(options) : {};
        if (!(model = this._prepareModel(model, options))) {
          return false;
        }
        if (!options.wait) {
          this.add(model, options);
        }
        success = options.success;
        options.success = function(resp) {
          if (options.wait) {
            _this.add(model, options);
          }
          return typeof success === "function" ? success(model, resp, options) : void 0;
        };
        model.save(null, options);
        return model;
      };

      Collection.prototype.parse = function(resp, options) {
        return resp;
      };

      Collection.prototype.clone = function() {
        return new this.constructor(this.models);
      };

      Collection.prototype._reset = function() {
        this.length = 0;
        this.models = [];
        return this._byId = {};
      };

      Collection.prototype._prepareModel = function(attrs, options) {
        var model;
        if (options == null) {
          options = {};
        }
        if (attrs instanceof Model) {
          if (!attrs.collection) {
            attrs.collection = this;
          }
          return attrs;
        }
        options.collection = this;
        model = new this.model(attrs, options);
        if (!model._validate(attrs, options)) {
          this.trigger('invalid', this, attrs, options);
          return false;
        }
        return model;
      };

      Collection.prototype._removeReference = function(model) {
        if (this === model.collection) {
          delete model.collection;
        }
        return model.off('all', this._onModelEvent, this);
      };

      Collection.prototype._onModelEvent = function(event, model, collection, options) {
        if ((event === 'add' || event === 'remove') && collection !== this) {
          return;
        }
        if (event === 'destroy') {
          this.remove(model, options);
        }
        if (model && event === ("change:" + model.idAttribute)) {
          delete this._byId[model.previous(model.idAttribute)];
          if (model.id != null) {
            this._byId[model.id] = model;
          }
        }
        return this.trigger.apply(this, arguments);
      };

      Collection.prototype.sortedIndex = function(model, value, context) {
        var iterator;
        if (value == null) {
          value = this.comparator;
        }
        iterator = _.isFunction(value) ? value : function(model) {
          return model.get(value);
        };
        return _.sortedIndex(this.models, model, iterator, context);
      };

      return Collection;

    })();
    methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl', 'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke', 'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest', 'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf', 'isEmpty', 'chain'];
    _.each(methods, function(method) {
      return Collection.prototype[method] = function() {
        var args;
        args = slice.call(arguments);
        args.unshift(this.models);
        return _[method].apply(_, args);
      };
    });
    attributeMethods = ['groupBy', 'countBy', 'sortBy'];
    _.each(attributeMethods, function(method) {
      return Collection.prototype[method] = function(value, context) {
        var iterator;
        iterator = _.isFunction(value) ? value : function(model) {
          return model.get(value);
        };
        return _[method](this.models, iterator, context);
      };
    });
    optionalParam = /\((.*?)\)/g;
    namedParam = /(\(\?)?:\w+/g;
    splatParam = /\*\w+/g;
    escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
    Router = Backbone.Router = (function() {

      function Router(options) {
        if (options == null) {
          options = {};
        }
        if (options.routes) {
          this.routes = options.routes;
        }
        this._bindRoutes();
        this.initialize.apply(this, arguments);
      }

      _.extend(Router.prototype, Events);

      Router.prototype.initialize = function() {};

      Router.prototype.route = function(route, name, callback) {
        var _this = this;
        if (callback == null) {
          callback = this[name];
        }
        if (!_.isRegExp(route)) {
          route = this._routeToRegExp(route);
        }
        Backbone.history.route(route, function(fragment) {
          var args;
          args = _this._extractParameters(route, fragment);
          if (callback != null) {
            callback.apply(_this, args);
          }
          _this.trigger.apply(_this, ['route:' + name].concat(args));
          _this.trigger('route', name, args);
          return Backbone.history.trigger('route', _this, name, args);
        });
        return this;
      };

      Router.prototype.navigate = function(fragment, options) {
        Backbone.history.navigate(fragment, options);
        return this;
      };

      Router.prototype._bindRoutes = function() {
        var route, routes, _results;
        if (!this.routes) {
          return;
        }
        routes = _.keys(this.routes);
        _results = [];
        while ((route = routes.pop()) != null) {
          _results.push(this.route(route, this.routes[route]));
        }
        return _results;
      };

      Router.prototype._routeToRegExp = function(route) {
        return RegExp("^" + (route.replace(escapeRegExp, '\\$&').replace(optionalParam, '(?:$1)?').replace(namedParam, function(match, optional) {
          if (optional) {
            return match;
          } else {
            return '([^\/]+)';
          }
        }).replace(splatParam, '(.*?)')) + "$");
      };

      Router.prototype._extractParameters = function(route, fragment) {
        return route.exec(fragment).slice(1);
      };

      return Router;

    })();
    routeStripper = /^[#\/]|\s+$/g;
    rootStripper = /^\/+|\/+$/g;
    isExplorer = /msie [\w.]+/;
    trailingSlash = /\/$/;
    History = Backbone.History = (function() {

      History.started = false;

      function History() {
        this.handlers = [];
        _.bindAll(this, 'checkUrl');
        if (typeof window !== "undefined" && window !== null) {
          this.location = window.location;
          this.history = window.history;
        }
      }

      _.extend(History.prototype, Events);

      History.prototype.interval = 50;

      History.prototype.getHash = function(window) {
        var match;
        match = (window || this).location.href.match(/#(.*)$/);
        if (match) {
          return match[1];
        } else {
          return '';
        }
      };

      History.prototype.getFragment = function(fragment, forcePushState) {
        if (fragment == null) {
          if (this.hasPushState || !this._wantsHashChange || forcePushState) {
            fragment = this.location.pathname;
            root = this.root.replace(trailingSlash, '');
            if (__indexOf.call(fragment, root) < 0) {
              fragment = fragment.substr(root.length);
            }
          } else {
            fragment = this.getHash();
          }
        }
        return fragment.replace(routeStripper, '');
      };

      History.prototype.start = function(options) {
        var atRoot, docMode, fragment, loc, oldIE;
        if (History.started) {
          throw new Error("Backbone.history has already been started");
        }
        History.started = true;
        this.options = _.extend({}, {
          root: '/'
        }, this.options, options);
        this.root = this.options.root;
        this._wantsHashChange = this.options.hashChange !== false;
        this._wantsPushState = !!this.options.pushState;
        this._hasPushState = !!(this.options.pushState && this.history && this.history.pushState);
        fragment = this.getFragment();
        docMode = document.documentMode;
        oldIE = isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7);
        this.root = ("/" + this.root + "/").replace(rootStripper, '/');
        if (oldIE && this._wantsHashChange) {
          this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
          this.navigate(fragment);
        }
        if (this._hasPushState) {
          Backbone.$(window).on('popstate', this.checkUrl);
        } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
          Backbone.$(window).on('hashchange', this.checkUrl);
        } else if (this._wantsHashChange) {
          this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
        }
        this.fragment = fragment;
        loc = this.location;
        atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;
        if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
          this.fragment = this.getFragment(null, true);
          this.location.replace(this.root + this.location.search + '#' + this.fragment);
          return true;
        } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
          this.fragment = this.getHash().replace(routeStripper, '');
          this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
        }
        if (!this.options.silent) {
          return this.loadUrl();
        }
      };

      History.prototype.stop = function() {
        Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
        clearInterval(this._checkUrlInterval);
        return History.started = false;
      };

      History.prototype.route = function(route, callback) {
        return this.handlers.unshift({
          route: route,
          callback: callback
        });
      };

      History.prototype.checkUrl = function(e) {
        var current;
        current = this.getFragment();
        if (current === this.fragment && this.iframe) {
          current = this.getFragment(this.getHash(this.iframe));
        }
        if (current === this.fragment) {
          return false;
        }
        if (this.iframe) {
          this.navigate(current);
        }
        return this.loadUrl() || this.loadUrl(this.getHash());
      };

      History.prototype.loadUrl = function(fragmentOverride) {
        var fragment, matched;
        fragment = this.fragment = this.getFragment(fragmentOverride);
        matched = _.any(this.handlers, function(handler) {
          if (handler.route.test(fragment)) {
            handler.callback(fragment);
            return true;
          }
        });
        return matched;
      };

      History.prototype.navigate = function(fragment, options) {
        var url;
        if (!History.started) {
          return false;
        }
        if (!options || options === true) {
          options = {
            trigger: options
          };
        }
        fragment = this.getFragment(fragment || '');
        if (this.fragment === fragment) {
          return;
        }
        this.fragment = fragment;
        url = this.root + fragment;
        if (this._hasPushState) {
          this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);
        } else if (this._wantsHashChange) {
          this._updateHash(this.location, fragment, options.replace);
          if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
            if (!options.replace) {
              this.iframe.document.open().close();
            }
            this._updateHash(this.iframe.location, fragment, options.replace);
          }
        } else {
          return this.location.assign(url);
        }
        if (options.trigger) {
          return this.loadUrl(fragment);
        }
      };

      History.prototype._updateHash = function(location, fragment, replace) {
        var href;
        if (replace) {
          href = location.href.replace(/(javascript:|#).*$/, '');
          return location.replace(href + '#' + fragment);
        } else {
          return location.hash = '#' + fragment;
        }
      };

      return History;

    })();
    Backbone.history = new History;
    delegateEventSplitter = /^(\S+)\s*(.*)$/;
    viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];
    View = Backbone.View = (function() {

      function View(options) {
        this.cid = _.uniqueId('view');
        this._configure(options || {});
        this._ensureElement();
        this.initialize.apply(this, arguments);
        this.delegateEvents();
      }

      _.extend(View.prototype, Events);

      View.prototype.tagName = 'div';

      View.prototype.$ = function(selector) {
        return this.$el.find(selector);
      };

      View.prototype.initialize = function() {};

      View.prototype.render = function() {
        return this;
      };

      View.prototype.remove = function() {
        this.$el.remove();
        this.stopListening();
        return this;
      };

      View.prototype.setElement = function(element, delegate) {
        if (this.$el) {
          this.undelegateEvents();
        }
        this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
        this.el = this.$el[0];
        if (delegate !== false) {
          this.delegateEvents();
        }
        return this;
      };

      View.prototype.delegateEvents = function(events) {
        var eventName, key, match, method, selector, _ref;
        if (!(events || (events = _.result(this, 'events')))) {
          return this;
        }
        this.undelegateEvents();
        for (key in events) {
          method = events[key];
          if (!_.isFunction(method)) {
            method = this[events[key]];
          }
          if (!method) {
            throw new Error("Method '" + events[key] + "' does not exist");
          }
          match = key.match(delegateEventSplitter);
          _ref = [match[1], match[2]], eventName = _ref[0], selector = _ref[1];
          method = _.bind(method, this);
          eventName += '.delegateEvents' + this.cid;
          if (selector === '') {
            this.$el.on(eventName, method);
          } else {
            this.$el.on(eventName, selector, method);
          }
        }
        return this;
      };

      View.prototype.undelegateEvents = function() {
        this.$el.off('.delegateEvents' + this.cid);
        return this;
      };

      View.prototype._configure = function(options) {
        if (this.options) {
          options = _.extend({}, _.result(this, 'options'), options);
        }
        _.extend(this, _.pick(options, viewOptions));
        return this.options = options;
      };

      View.prototype._ensureElement = function() {
        var $el, attrs;
        if (this.el) {
          return this.setElement(_.result(this, 'el'), false);
        } else {
          attrs = _.extend({}, _.result(this, 'attributes'));
          if (this.id) {
            attrs.id = _.result(this, 'id');
          }
          if (this.className) {
            attrs['class'] = _.result(this, 'className');
          }
          $el = Backbone.$("<" + (_.result(this, 'tagName')) + ">").attr(attrs);
          return this.setElement($el, false);
        }
      };

      return View;

    })();
    methodMap = {
      create: 'POST',
      update: 'PUT',
      patch: 'PATCH',
      "delete": 'DELETE',
      read: 'GET'
    };
    Backbone.sync = function(method, model, options) {
      var beforeSend, params, type, xhr;
      if (options == null) {
        options = {};
      }
      type = methodMap[method];
      _.defaults(options, {
        emulateHTTP: Backbone.emulateHTTP,
        emulateJSON: Backbone.emulateJSON
      });
      params = {
        type: type,
        dataType: 'json'
      };
      if (!options.url) {
        params.url = _.result(model, 'url') || urlError();
      }
      if (!(options.data != null) && model && (method === 'create' || method === 'update' || method === 'patch')) {
        params.contentType = 'application/json';
        params.data = JSON.stringify(options.attrs || model.toJSON(options));
      }
      if (options.emulateJSON) {
        params.contentType = 'application/x-www-form-urlencoded';
        params.data = params.data ? {
          model: params.data
        } : {};
      }
      if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
        params.type = 'POST';
        if (options.emulateJSON) {
          params.data._method = type;
        }
        beforeSend = options.beforeSend;
        options.beforeSend = function(xhr) {
          xhr.setRequestHeader('X-HTTP-Method-Override', type);
          if (beforeSend) {
            return beforeSend.apply(this, arguments);
          }
        };
      }
      if (!(params.type === 'GET' || options.emulateJSON)) {
        params.processData = false;
      }
      xhr = options.xhr = Backbone.ajax(_.extend(params, options));
      model.trigger('request', model, xhr, options);
      return xhr;
    };
    Backbone.ajax = function() {
      return Backbone.$.ajax.apply(Backbone.$, arguments);
    };
    extend = function(protoProps, staticProps) {
      return (function(_super) {

        __extends(_Class, _super);

        function _Class() {
          return _Class.__super__.constructor.apply(this, arguments);
        }

        _.extend(_Class, staticProps);

        _.extend(_Class.prototype, protoProps);

        _Class.extend = extend;

        return _Class;

      })(this);
    };
    Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;
    urlError = function() {
      throw new Error('A "url" property or function must be specified');
    };
    return wrapError = function(model, options) {
      var error;
      error = options.error;
      return options.error = function(resp) {
        if (error) {
          error(model, resp, options);
        }
        return model.trigger('error', model, resp, options);
      };
    };
  })(this);

}).call(this);
