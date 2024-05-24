'use strict';
(function (ns) {
    var modules = {};
    var instance = {};
    var getModule = function (name) {
        if (!modules[name]) {
            throw Error(['module is undefined', name].join(' '));
        }
        return modules[name];
    };
    var newModule = function (name, params) {
        if (!modules[name]) {
            throw Error(['module is undefined', name].join(' '));
        }
        return new modules[name](params || {});
    };
    var addModule = function (name, module) {
        if (modules[name]) {
            throw Error(['module already added', name].join(' '));
        }
        modules[name] = module;
    };
    ns.$checkout = function (name, params) {
        if (instance[name]) return instance[name];
        return ( instance[name] = newModule(name, params) );
    };
    ns.$checkout.get = function (name, params) {
        return newModule(name, params);
    };
    ns.$checkout.module = function (name) {
        return getModule(name);
    };
    ns.$checkout.proxy = function (name) {
        return getModule(name).apply(this, Array.prototype.slice.call(arguments, 1));
    };
    ns.$checkout.add = function (name, module) {
        addModule(name, module);
        return this;
    };
    ns.$checkout.scope = function (name, module) {
        addModule(name, module(this));
        return this;
    };
})(window || {});


$checkout.scope('Class', function () {
    var init = false;
    var fnTest = /xyz/.test((function () {
        return 'xyz'
    }).toString()) ? /\b_super\b/ : /.*/;
    var Core = function () {

    };
    Core.prototype = {
        instance: function (params) {
            return new this.constructor(params);
        },
        proxy: function (fn) {
            fn = typeof(fn) === 'string' ? this[fn] : fn;
            return (function (cx, cb) {
                return function () {
                    return cb.apply(cx, [this].concat(Array.prototype.slice.call(arguments)))
                };
            })(this, fn);
        }
    };
    Core.extend = function (instance) {
        var prop, proto, parent = this.prototype;
        init = true;
        proto = new this();
        init = false;
        for (prop in instance) {
            if (instance.hasOwnProperty(prop)) {
                if (typeof(parent[prop]) === 'function' &&
                    typeof(instance[prop]) === 'function' &&
                    fnTest.test(instance[prop])
                ) {
                    proto[prop] = (function (name, fn) {
                        return function () {
                            var temp = this._super, result;
                            this._super = parent[name];
                            result = fn.apply(this, arguments);
                            this._super = temp;
                            return result;
                        };
                    })(prop, instance[prop]);
                } else {
                    proto[prop] = instance[prop];
                }
            }
        }

        function Class() {
            if (!init && this.init) this.init.apply(this, arguments);
        }

        Class.prototype = proto;
        Class.prototype.constructor = Core;
        Class.extend = Core.extend;
        return Class;
    };
    return Core;
});


$checkout.scope('Utils', function (ns) {
    return ns.module('Class').extend({
        getType: function (o) {
            return ({}).toString.call(o).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
        },
        isObject: function (o) {
            return this.getType(o) === 'object';
        },
        isPlainObject: function (o) {
            return (!!o && typeof o === 'object' && o.constructor === Object);
        },
        isFunction: function (o) {
            return this.getType(o) === 'function';
        },
        isRegexp: function (o) {
            return this.getType(o) === 'regexp';
        },
        isArguments: function (o) {
            return this.getType(o) === 'arguments';
        },
        isError: function (o) {
            return this.getType(o) === 'error';
        },
        isArray: function (o) {
            return this.getType(o) === 'array';
        },
        isDate: function (o) {
            return this.getType(o) === 'date';
        },
        isString: function (o) {
            return this.getType(o) === 'string';
        },
        isNumber: function (o) {
            return this.getType(o) === 'number';
        },
        isElement: function (o) {
            return o && o.nodeType === 1;
        },
        toArray: function (o) {
            return [].slice.call(o);
        },
        querySelectorAll: function (o, p) {
            return this.toArray((p || document).querySelectorAll(o));
        },
        querySelector: function (o, p) {
            return (p || document).querySelector(o);
        },
        forEach: function (ob, cb, cx) {
            var p;
            for (p in ob)
                if (ob.hasOwnProperty(p))
                    cb.call(cx || null, ob[p], p);
        },
        map: function (ob, cb, cx) {
            var p, t, r = [];
            for (p in ob)
                if (ob.hasOwnProperty(p))
                    if ((t = cb.call(cx || null, ob[p], p)) !== undefined)
                        r[p] = t;
            return r;
        },
        removeElement: function (el) {
            el.parentNode.removeChild(el);
        },
        createElement: function (el) {
            return document.createElement(el);
        },
        extend: function (obj) {
            this.forEach(Array.prototype.slice.call(arguments, 1), function (o) {
                if (o !== null) {
                    this.forEach(o, function (value, key) {
                        obj[key] = value;
                    });
                }
            }, this);
            return obj;
        }
    });
});


$checkout.scope('Deferred', function (ns) {

    var utils = ns('Utils');

    function isArray(o) {
        return utils.isArray(o);
    };

    function isFunction(o) {
        return utils.isFunction(o);
    };

    function foreach(arr, handler) {
        if (isArray(arr)) {
            for (var i = 0; i < arr.length; i++) {
                handler(arr[i]);
            }
        }
        else
            handler(arr);
    };

    function D(fn) {
        var status = 'pending',
            doneFuncs = [],
            failFuncs = [],
            progressFuncs = [],
            resultArgs = null,
            promise = {
                done: function () {
                    for (var i = 0; i < arguments.length; i++) {
                        if (!arguments[i]) {
                            continue;
                        }
                        if (isArray(arguments[i])) {
                            var arr = arguments[i];
                            for (var j = 0; j < arr.length; j++) {
                                if (status === 'resolved') {
                                    arr[j].apply(this, resultArgs);
                                }
                                doneFuncs.push(arr[j]);
                            }
                        }
                        else {
                            if (status === 'resolved') {
                                arguments[i].apply(this, resultArgs);
                            }
                            doneFuncs.push(arguments[i]);
                        }
                    }
                    return this;
                },
                fail: function () {
                    for (var i = 0; i < arguments.length; i++) {
                        if (!arguments[i]) {
                            continue;
                        }
                        if (isArray(arguments[i])) {
                            var arr = arguments[i];
                            for (var j = 0; j < arr.length; j++) {
                                if (status === 'rejected') {
                                    arr[j].apply(this, resultArgs);
                                }
                                failFuncs.push(arr[j]);
                            }
                        }
                        else {
                            if (status === 'rejected') {
                                arguments[i].apply(this, resultArgs);
                            }
                            failFuncs.push(arguments[i]);
                        }
                    }
                    return this;
                },
                always: function () {
                    return this.done.apply(this, arguments).fail.apply(this, arguments);
                },
                progress: function () {
                    for (var i = 0; i < arguments.length; i++) {
                        if (!arguments[i]) {
                            continue;
                        }
                        if (utils.isArray(arguments[i])) {
                            var arr = arguments[i];
                            for (var j = 0; j < arr.length; j++) {
                                if (status === 'pending') {
                                    progressFuncs.push(arr[j]);
                                }
                            }
                        }
                        else {
                            if (status === 'pending') {
                                progressFuncs.push(arguments[i]);
                            }
                        }
                    }
                    return this;
                },
                then: function () {
                    if (arguments.length > 1 && arguments[1]) {
                        this.fail(arguments[1]);
                    }
                    if (arguments.length > 0 && arguments[0]) {
                        this.done(arguments[0]);
                    }
                    if (arguments.length > 2 && arguments[2]) {
                        this.progress(arguments[2]);
                    }
                    return this;
                },
                promise: function (obj) {
                    if (obj === null) {
                        return promise;
                    } else {
                        for (var i in promise) {
                            obj[i] = promise[i];
                        }
                        return obj;
                    }
                },
                state: function () {
                    return status;
                },
                debug: function () {
                    console.log('[debug]', doneFuncs, failFuncs, status);
                },
                isRejected: function () {
                    return status === 'rejected';
                },
                isResolved: function () {
                    return status === 'resolved';
                },
                pipe: function (done, fail) {
                    return D(function (def) {
                        foreach(done, function (func) {
                            if (typeof func === 'function') {
                                deferred.done(function () {
                                    var returnval = func.apply(this, arguments);
                                    if (returnval && typeof returnval === 'function') {
                                        returnval.promise().then(def.resolve, def.reject, def.notify);
                                    }
                                    else {
                                        def.resolve(returnval);
                                    }
                                });
                            }
                            else {
                                deferred.done(def.resolve);
                            }
                        });
                        foreach(fail, function (func) {
                            if (typeof func === 'function') {
                                deferred.fail(function () {
                                    var returnval = func.apply(this, arguments);
                                    if (returnval && typeof returnval === 'function') {
                                        returnval.promise().then(def.resolve, def.reject, def.notify);
                                    } else {
                                        def.reject(returnval);
                                    }
                                });
                            }
                            else {
                                deferred.fail(def.reject);
                            }
                        });
                    }).promise();
                }
            },
            deferred = {
                resolveWith: function (context) {
                    if (status === 'pending') {
                        status = 'resolved';
                        var args = resultArgs = (arguments.length > 1) ? arguments[1] : [];
                        for (var i = 0; i < doneFuncs.length; i++) {
                            doneFuncs[i].apply(context, args);
                        }
                    }
                    return this;
                },
                rejectWith: function (context) {
                    if (status === 'pending') {
                        status = 'rejected';
                        var args = resultArgs = (arguments.length > 1) ? arguments[1] : [];
                        for (var i = 0; i < failFuncs.length; i++) {
                            failFuncs[i].apply(context, args);
                        }
                    }
                    return this;
                },
                notifyWith: function (context) {
                    if (status === 'pending') {
                        var args = resultArgs = (arguments.length > 1) ? arguments[1] : [];
                        for (var i = 0; i < progressFuncs.length; i++) {
                            progressFuncs[i].apply(context, args);
                        }
                    }
                    return this;
                },
                resolve: function () {
                    return this.resolveWith(this, arguments);
                },
                reject: function () {
                    return this.rejectWith(this, arguments);
                },
                notify: function () {
                    return this.notifyWith(this, arguments);
                }
            };

        var obj = promise.promise(deferred);
        if (isFunction(fn)) {
            fn.apply(obj, [obj]);
        }
        return obj;
    };
    return D;
});


$checkout.scope('Event', function (ns) {
    return ns.module('Class').extend({
        init: function () {
            this.events = {};
            this.empty = [];
        },
        on: function (type, callback) {
            (this.events[type] = this.events[type] || []).push(callback);
            return this;
        },
        off: function (type, callback) {
            type || (this.events = {});
            var list = this.events[type] || this.empty, i = list.length = callback ? list.length : 0;
            while (i--) callback === list[i][0] && list.splice(i, 1);
            return this;
        },
        trigger: function (type) {
            var e = this.events[type] || this.empty, list = e.length > 0 ? e.slice(0, e.length) : e, i = 0, j;
            while (j = list[i++]) j.apply(j, this.empty.slice.call(arguments, 1));
            return this;
        }
    });
});

$checkout.scope('Module', function (ns) {
    return ns.module('Class').extend({
        utils: ns('Utils'),
        proxy: function (fn) {
            if (!this._p_c_) this._p_c_ = {};
            if (!this._p_c_[fn]) this._p_c_[fn] = this._super(fn);
            return this._p_c_[fn];
        },
        each: function (ob, cb) {
            this.utils.forEach(ob, this.proxy(cb));
        },

        addAttr: function (el, ob) {
            if (!this.utils.isElement(el)) return false;
            this.utils.forEach(ob, function (v, k) {
                el.setAttribute(k, v);
            });
        },
        addCss: function (el, ob) {
            if (!this.utils.isElement(el)) return false;
            this.utils.forEach(ob, function (v, k) {
                el.style[k] = v;
            });
        },
        addEvent: function (el, ev, cb) {
            if (!el || !ev || !cb) return false;
            cb = this.proxy(cb);
            if (el.addEventListener) el.addEventListener(ev, cb);
            else if (el.attachEvent) el.attachEvent('on' + ev, cb);
        },
        removeEvent: function (el, ev, cb) {
            if (!el || !ev || !cb) return false;
            cb = this.proxy(cb);
            if (el.removeEventListener) el.removeEventListener(ev, cb, false);
            else if (el.detachEvent) el.detachEvent('on' + ev, cb);
        },
        prepareForm: function (url, data, target, method) {
            var form = this.utils.createElement('form');
            this.addAttr(form, {
                'action': url,
                'target': target || '_self',
                'method': method || 'POST'
            });
            this.addCss(form, {
                'display': 'none'
            });
            this.utils.forEach(data, function (v, k, el) {
                el = this.utils.createElement('input');
                el.type = 'hidden';
                el.name = k;
                el.value = v;
                form.appendChild(el);
            }, this);
            return form;
        }
    });
});

$checkout.scope('Connector', function (ns) {
    return ns.module('Module').extend({
        ns: 'crossDomain',
        origin: '*',
        uniqueId: 1,
        init: function (params) {
            this.setTarget(params.target);
            this.create();
        },
        create: function () {
            this.listener = ns.get('Event');
            this.addEvent(window, 'message', 'router');
        },
        setTarget: function (target) {
            this.target = target;
            return this;
        },
        getUID: function () {
            return ++this.uniqueId;
        },
        unbind: function (action, callback) {
            this.listener.off([this.ns, action].join('.'), callback);
        },
        action: function (action, callback) {
            this.listener.on([this.ns, action].join('.'), callback);
        },
        publish: function (action, data) {
            this.listener.trigger([this.ns, action].join('.'), data);
        },
        router: function (window, ev, response) {
            try {
                response = JSON.parse(ev.data);
            } catch (e) {
            }
            if (response.action && response.data) {
                this.publish(response.action, response.data);
            }
        },
        send: function (action, data) {
            this.target.postMessage(JSON.stringify({
                action: action,
                data: data
            }), this.origin, []);
        }
    });
});

$checkout.scope('AcsFrame', function (ns) {
    return ns.module('Module').extend({
        name: 'acsframe',
        className: 'ipsp-modal-iframe',
        attrs: {
            'frameborder': '0',
            'allowtransparency': 'true',
            'scrolling': 'no'
        },
        styles: {
            'overflowX': 'hidden',
            'border': '0',
            'display': 'block',
            'width': '100%',
            'height': '750px'
        },
        init: function (params) {
            this.checkout = params.checkout;
            this.data = params.data;
            this.template = ns.views['3ds.html'];
            this.initModal();
            this.initEvents();
            this.initFrame();
            this.initConnector();
        },
        initModal: function () {
            this.modal = this.utils.createElement('div');
            this.modal.innerHTML = this.template;
            this.utils.querySelector('body').appendChild(this.modal);
        },
        initFrame: function () {
            this.name = [this.name, Math.round(Math.random() * 1000000000)].join('');
            this.wrapper = this.find('.ipsp-modal-content');
            this.iframe = this.utils.createElement('iframe');
            this.addAttr(this.iframe, {
                'id': this.id,
                'name': this.name,
                'class': this.className
            });
            this.addAttr(this.iframe, this.attrs);
            this.addCss(this.iframe, this.styles);
            this.form = this.prepareForm(this.data.url, this.data.send_data, this.name);
            this.wrapper.appendChild(this.iframe);
            this.wrapper.appendChild(this.form);
            this.form.submit();
        },
        find: function (selector) {
            return this.utils.querySelector(selector, this.modal);
        },
        initEvents: function () {
            var close = this.find('.ipsp-modal-close');
            var link = this.find('.ipsp-modal-title a');
            this.addEvent(close, 'click', function (el, ev) {
                ev.preventDefault();
                this.removeModal();
            });
            this.addEvent(link, 'click', function (el, ev) {
                ev.preventDefault();
                this.form.submit();
            });
        },
        removeModal: function () {
            this.utils.removeElement(this.modal);
        },
        initConnector: function () {
            this.connector = ns.get('Connector');
            this.connector.action('response', this.proxy(function (ev, data) {
                this.connector.unbind('response');
                this.checkout.connector.send('request', {
                    uid: data.uid,
                    action: 'api.checkout.proxy',
                    method: 'send',
                    params: data
                });
                this.removeModal();
            }, this));
        }
    });
});

$checkout.scope('Model', function (ns) {
    return ns.module('Module').extend({
        init: function (data) {
            if (data) {
                this.data = data;
            } else {
                this.data = {};
            }
        },
        attr: function (key, value) {
            var i = 0,
                data = this.data,
                name = (key || '').split('.'),
                prop = name.pop(),
                len = arguments.length;
            for (; i < name.length; i++) {
                if (data && data.hasOwnProperty(name[i])) {
                    data = data[name[i]];
                }
                else {
                    if (len == 2) {
                        data = (data[name[i]] = {});
                    }
                    else {
                        break;
                    }
                }
            }
            if (len == 1) {
                return data ? data[prop] : undefined;
            }
            if (len == 2) {
                data[prop] = value;
            }
            return this;
        }
    });
});

$checkout.scope('Response', function (ns) {
    return ns.module('Model').extend({
        formDataSubmit: function (url, data, target, method) {
            var form = this.prepareForm(url, data, target, method);
            var body = this.utils.querySelector('body');
            body.appendChild(form);
            form.submit();
            form.parentNode.removeChild(form);
        },
        redirectUrl: function () {
            if (this.attr('url')) {
                location.assign(this.attr('url'));
                return true;
            }
        },
        submitForm: function () {
            var method = this.attr('method');
            var url = this.attr('url');
            var data = this.attr('send_data');
            this.formDataSubmit(url, data, '_top', method);
            return true;
        },
        sendResponse: function () {
            var action = this.attr('action');
            if (action == 'submit')
                return this.submitForm();
            if (action == 'redirect')
                return this.redirectUrl();
            return false;
        }
    });
});

$checkout.scope('FormData', function (ns) {
    return ns.module('Module').extend({
        init: function (form) {
            this.setFormElement(form);
        },
        setFormElement: function (form) {
            if (this.utils.isElement(form)) {
                this.form = form;
            }
        },
        getData: function(filter){
            var params = this.deparam(this.serializeArray());
            return filter == true ? this.clean(params) : params;
        },
        clean: function (obj) {
            var prop;
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    if (obj[prop].length === 0) {
                        if (this.utils.isArray(obj)) obj.splice(prop, 1);
                        if (this.utils.isPlainObject(obj)) delete obj[prop];
                    } else if (this.utils.isPlainObject(obj[prop])) {
                        this.clean(obj[prop]);
                    }
                }
            }
            return obj;
        },
        serializeArray: function () {
            var list = this.utils.toArray(this.form.elements);
            var data = this.utils.map(list, function (field) {
                if (field.disabled || field.name == '') return;
                if (field.type.match('checkbox|radio') && !field.checked) return;
                return {
                    name: field.name,
                    value: field.value
                };
            });
            return data;
        },
        serializeAndEncode: function () {
            return this.utils.map(this.serializeArray(), function (field) {
                return [field.name, encodeURIComponent(field.value)].join('=');
            }).join('&');
        },
        deparam: function( obj ){
            var prop;
            var result  = {};
            var breaker = /[^\[\]]+|\[\]$/g;
            var attr = function(name,value){
                var i,data = result,last=name.pop(),len=name.length;
                for(i=0;i<len;i++){
                    if(!data[name[i]])
                        data[name[i]] = len == i+1 && last=='[]' ?  [] : {};
                    data = data[name[i]];
                }
                if( last=='[]' ){
                    data.push(value);
                } else {
                    data[last] = value;
                }
            };
            for(prop in obj){
                if(obj.hasOwnProperty(prop)){
                    attr(obj[prop].name.match(breaker),obj[prop].value);
                }
            }
            return result;
        }
    });
});

$checkout.scope('Api', function (ns) {
    return ns.module('Module').extend({
        origin: 'https://payment.albpay.io',
        endpoint: {
            gateway: '/checkout/v2/'
        },
        init: function () {
            this.loaded = false;
            this.created = false;
            this.listener = ns.get('Event');
            this.connector = ns.get('Connector');
        },
        setOrigin: function (origin) {
            this.origin = origin;
            return this;
        },
        url: function (type, url) {
            return [this.origin, this.endpoint[type] || '/', url || ''].join('');
        },
        loadFrame: function (url) {
            this.iframe = this.utils.createElement('iframe');
            this.addAttr(this.iframe, {'src': url});
            this.addCss(this.iframe, {'display': 'none'});
            this.utils.querySelector('body').appendChild(this.iframe);
            return this.iframe;
        },
        create: function () {
            if (this.created === false) {
                this.created = true;
                this.iframe = this.loadFrame(this.url('gateway'));
                this.connector.setTarget(this.iframe.contentWindow);
                this.connector.action('load', this.proxy('load'));
                this.connector.action('form3ds', this.proxy('form3ds'));
            }
            return this;
        },
        form3ds: function (xhr, data) {
            this.acsframe = ns.get('AcsFrame', {checkout: this, data: data});
        },
        load: function () {
            this.loaded = true;
            this.listener.trigger('checkout.api');
            this.listener.off('checkout.api');
        },
        scope: function (callback) {
            callback = this.proxy(callback);
            if (this.create().loaded === true) {
                callback();
            } else {
                this.listener.on('checkout.api', callback);
            }
        },
        defer: function () {
            return ns.get('Deferred');
        },
        request: function (model, method, params) {
            var defer = this.defer();
            var data = {};
            data.uid = this.connector.getUID();
            data.action = model;
            data.method = method;
            data.params = params || {};
            this.connector.send('request', data);
            this.connector.action(data.uid, this.proxy(function (ev, response) {
                defer[response.error ? 'rejectWith' : 'resolveWith'](this, [ns.get('Response', response)]);
            }, this));
            return defer;
        }
    });
});
'use strict';
$checkout.views = Object.create(null);
$checkout.views['3ds.html'] = '<style>\n    .ipsp-modal-show{\n        overflow:hidden;\n    }\n    .ipsp-modal{\n        margin:100px auto;\n        max-width:680px;\n        background-color:#fff;\n        border-radius:5px;\n        box-shadow:0px 2px 2px rgba(0,0,0,0.2);\n        overflow: hidden;\n    }\n    @media (max-width:850px){\n        .ipsp-modal{\n            margin:50px auto;\n        }\n    }\n    @media (max-width:695px){\n        .ipsp-modal{\n            max-width:100%;\n            margin:5px;\n        }\n    }\n    .ipsp-modal-wrapper{\n        overflow: auto;\n        position:fixed;\n        z-index:99999;\n        left:0;\n        bottom:0;\n        top:0;\n        right:0;\n        background-color: rgba(0,0,0,0.2);\n    }\n    .ipsp-modal-header{\n        background-color:#fafafa;\n        height:50px;\n        box-shadow:0px 0px 2px rgba(0,0,0,0.2);\n        border-top-left-radius:5px;\n        border-top-right-radius:5px;\n    }\n    .ipsp-modal-close{\n        float:right;\n        overflow:hidden;\n        height:50px;\n        text-decoration:none;\n        border-top-right-radius:5px;\n        color:#949494;\n    }\n    .ipsp-modal-close:hover,.ipsp-modal-close:focus,.ipsp-modal-close:active{\n        text-decoration:none;\n        color:#646464;\n    }\n    .ipsp-modal-close:before{\n        content:"×";\n        font-size:50px;\n        line-height:50px;\n        padding:0 10px;\n    }\n    .ipsp-modal-title{\n        border-top-left-radius:5px;\n        line-height:20px;\n        height:50px;\n        padding:5px 15px;\n        font-size:12px;\n        display:table-cell;\n        vertical-align: middle;\n    }\n    .ipsp-modal-content{\n        border-bottom-left-radius:5px;\n        border-bottom-left-radius:5px;\n        min-height:650px;\n    }\n</style>\n<div class="ipsp-modal-wrapper">\n    <div class="ipsp-modal">\n        <div class="ipsp-modal-header">\n            <a href="#" class="ipsp-modal-close"></a>\n            <div class="ipsp-modal-title">\n                Now you will be redirected to your bank 3DSecure.\n                If you are not redirected please refer\n                <a href=\'javascript:void(0)\'>link</a>\n            </div>\n        </div>\n        <div class="ipsp-modal-content"></div>\n    </div>\n</div>';


(function(){
"use strict";
angular.module('mx.checkout', [
  'mx/template/checkout/checkout.html',
  'mx/template/checkout/card.html',
  'mx/template/checkout/ibank.html',
  'mx/template/checkout/emoney.html',
  'mx/template/checkout/field-input.html',
  'mx/template/checkout/alert.html'
]);

;
angular.module('mx.checkout').component('mxAlert', {
  templateUrl: 'mx/template/checkout/alert.html',
  bindings: {
    alert: '<'
  }
});

;
angular.module('mx.checkout').constant('mxCheckoutConfig', {
  fields: {
    card: {
      id: 'card_number',
      // placeholder: 'Card number',
      text: 'Card number',
      label: true,
      size: '19',
      pattern: '[0-9]{14,19}',
      valid: 'ccard,required'
    },
    expireMonth: {
      id: 'expiry_month',
      placeholder: 'MM',
      text: 'Expiration',
      label: true,
      size: '2',
      pattern: '[0-9]{2}',
      valid: 'exp_date,required',
      bind: 'expiry_year',
      format: 'month'
    },
    expireYear: {
      id: 'expiry_year',
      placeholder: 'YY',
      label: true,
      size: '2',
      pattern: '[0-9]{2}',
      valid: 'exp_date,required',
      bind: 'expiry_month',
      format: 'year'
    },
    cvv: {
      id: 'cvv2',
      // placeholder: 'CVV',
      text: 'Security Code',
      label: true,
      info:
        'CVV/CVC2 – this 3-digits are security code. It is located in the signature field on the back of your payment card (last three digits)',
      size: '3',
      pattern: '[0-9]{3}',
      valid: 'cvv2,required'
    },
    name: {
      id: 'name',
      placeholder: 'Name',
      text: 'Name',
      label: true,
      valid: 'required'
    },
    email: {
      id: 'email',
      placeholder: 'Email',
      text: 'Email',
      label: true,
      valid: 'required'
    },
    phone: {
      id: 'phone',
      placeholder: 'Phone',
      text: 'Phone',
      label: true,
      valid: 'required'
    }
  },
  error: {
    required: 'Required field',
    ccard: 'Credit card number is invalid',
    exp_date: 'Invalid expiry date',
    cvv2: 'Incorrect CVV2 format',
    card: "Please verify that all card information you've provided is accurate and try again"
  },
  tabs: {
    card: {
      id: 'card',
      icons: ['visa', 'master', 'american', 'discover'],
      name: 'Credit or Debit Card',
      payment_systems: {
        card: {
          formMap: ['card_number', 'expiry_month', 'expiry_year', 'cvv2']
        }
      }
    },
    emoney: {
      id: 'emoney',
      icons: [],
      name: 'Electronic money',
      payment_systems: {
        webmoney: {
          name: 'Webmoney',
          formMap: ['phone', 'email']
        }
      }
    },
    ibank: {
      id: 'ibank',
      icons: [],
      name: 'Internet-banking',
      payment_systems: {
        p24: {
          name: 'Приват24',
          formMap: ['name', 'email']
        },
        plotva24: {
          name: 'PLATBA 24'
        }
      }
    }
  }
});

;
angular
  .module('mx.checkout')
  .directive('mxCheckout', function(mxCheckout) {
    return {
      restrict: 'A',
      templateUrl: 'mx/template/checkout/checkout.html',
      transclude: true,
      scope: {
        mxCheckoutOptions: '=?',
        onError: '&',
        onSuccess: '&'
      },
      controller: mxCheckout.controller
    };
  })
  .directive('mxCheckoutField', function(mxCheckout) {
    return {
      require: '^^mxCheckout',
      restrict: 'A',
      scope: {
        name: '@',
        value: '@'
      },
      link: function(scope, element, attrs, checkoutCtrl) {
        checkoutCtrl.addParams(scope);
      }
    };
  })
  .directive('mxFieldInput', function() {
    return {
      restrict: 'A',
      replace: true,
      templateUrl: 'mx/template/checkout/field-input.html',
      scope: {
        model: '=mxFieldInput',
        config: '=',
        blur: '&',
        focus: '&'
      }
    };
  })
  .directive('mxAutoFocus', function($timeout) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs, ngModel) {
        scope.$watch(
          attrs.mxAutoFocus,
          function(val) {
            if (angular.isDefined(val) && val) {
              $timeout(function() {
                element[0].focus();
              });
            }
          },
          true
        );
      }
    };
  })
  .directive('mxFieldValid', function(mxValidation, mxCheckoutConfig) {
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        valid: '=mxFieldValid',
        config: '=',
        model: '='
      },
      link: function(scope, element, attrs, ngModel) {
        if (scope.config.valid) {
          angular.forEach(scope.config.valid.split(','), function(valid) {
            // валидируем при инициализации
            // console.log('init ' + ngModel.$name + ' ' + valid)
            validate(
              valid,
              scope.model[scope.config.id], //ngModel.$modelValue,
              scope.model[scope.config.bind],
              setError
            );

            // когда поле валидно убираем tooltip
            scope.$watch(
              function() {
                return ngModel.$modelValue;
              },
              function(value) {
                if (ngModel.$valid) {
                  scope.valid.errorText[ngModel.$name] = '';
                }
              },
              true
            );

            //view -> model
            ngModel.$parsers.push(function(value) {
              // console.log('$parsers ' + ngModel.$name + ' ' + valid)
              validate(valid, value, scope.model[scope.config.bind], setError);
              return value;
            });
          });
        }

        if (scope.config.bind) {
          attrs.$observe('bind', function(value) {
            // console.log('$observe ' + scope.config.bind + ' exp_date')
            validate('exp_date', ngModel.$modelValue, value, function(result, valid) {
              ngModel.$setValidity(valid, result);
            });
          });
        }

        function validate(valid, value, bind, cb) {
          mxValidation.validate(
            {
              value: value,
              config: scope.config,
              bind: bind
            },
            valid,
            cb
          );
        }

        function setError(result, valid) {
          if (result) {
            scope.valid.iconShow[scope.config.bind] = false;
          } else {
            scope.valid.errorText[ngModel.$name] = mxCheckoutConfig.error[valid];
          }
          ngModel.$setValidity(valid, result);
        }
      }
    };
  });

;
angular.module('mx.checkout').filter('trusted', function($sce) {
  return function(url) {
    return $sce.trustAsResourceUrl(url);
  };
});

;
angular
  .module('mx.checkout')
  .provider('mxCheckout', function() {
    var defaultOptions = {
      panelClass: 'panel-checkout',
      alertDangerClass: 'alert-checkout-danger',
      formControlClass: 'form-control form-control-checkout',
      btnClass: 'btn-checkout',
      tooltipClass: 'tooltip-checkout',

      active: 'card',
      tabs: ['card', 'ibank', 'emoney'],
      ibank: ['p24'],
      emoney: ['webmoney']
    };
    var globalOptions = {};

    return {
      options: function(value) {
        angular.extend(globalOptions, value);
      },
      $get: function() {
        return {
          controller: [
            '$scope',
            'mxCheckoutConfig',
            '$element',
            'mxCheckout',
            function($scope, mxCheckoutConfig, $element, mxCheckout) {
              var api = $checkout('Api').setOrigin('https://payment.albpay.io');

              $scope.data = {
                options: getOption(),
                config: angular.copy(mxCheckoutConfig),
                disabled: false
              };

              $scope.formSubmit = formSubmit;
              $scope.stop = mxCheckout.stop;
              $scope.blur = blur;
              $scope.focus = focus;
              $scope.selectPaymentSystems = selectPaymentSystems;
              this.addParams = addParams;

              angular.forEach($scope.data.config.fields, function(item) {
                item.formControlClass = $scope.data.options.formControlClass;
                item.tooltipClass = $scope.data.options.tooltipClass;
              });
              $scope.data.config.tabs[$scope.data.options.active].open = true;

              angular.forEach($scope.data.options.tabs, function(tab) {
                $scope.data[tab] = {
                  alert: {},
                  valid: { errorText: {}, iconShow: {}, autoFocus: {} },
                  form: angular.extend({}, $scope.data.options.params)
                };
                if (tab === 'card') selectPaymentSystems($scope.data.config.tabs.card, 'card');
              });

              function addParams(field) {
                angular.forEach($scope.data.options.tabs, function(tab) {
                  $scope.data[tab].form[field.name] = field.value;
                });
              }

              function formSubmit() {
                var tab = getActiveTab();
                var data = $scope.data[tab.id];

                if (data.formCtrl.$valid) {
                  if ($scope.data.disabled) return;
                  $scope.data.disabled = true;
                  console.log('data.form', data.form);
                  api.scope(function() {
                    this.request('api.checkout.form', 'request', data.form)
                      .done(function(model) {
                        data.alert = {};
                        $scope.onSuccess({
                          response: model
                        });
                        model.sendResponse();
                        $scope.data.disabled = false;
                        $scope.$apply();
                      })
                      .fail(function(model) {
                        $scope.data.disabled = false;
                        addAlert(data, [model.attr('error.code'), model.attr('error.message')].join(' '));
                        $scope.onError({
                          response: model
                        });
                        $scope.$apply();
                      });
                  });
                } else {
                  var autoFocusFlag = true;
                  if (tab.selected) {
                    angular.forEach(tab.payment_systems[tab.selected].formMap, function(field) {
                      if (data.formCtrl[field].$invalid) {
                        if (autoFocusFlag) {
                          autoFocusFlag = false;
                          data.valid.autoFocus[field] = +new Date();
                          data.valid.iconShow[field] = false;
                        } else {
                          data.valid.iconShow[field] = true;
                        }
                      }
                    });
                  }
                  if (tab.id === 'card') {
                    addAlert(data, $scope.data.config.error.card);
                  }
                }
              }

              function blur(inputCtrl, data) {
                if (inputCtrl.$invalid) {
                  data.valid.iconShow[inputCtrl.$name] = true;
                }
              }

              function focus(inputCtrl, data) {
                if (inputCtrl.$invalid) {
                  data.valid.iconShow[inputCtrl.$name] = false;
                }
              }

              function selectPaymentSystems(tab, id) {
                tab.selected = id;
                $scope.data[tab.id].form.payment_system = id;
              }

              function getActiveTab() {
                var result;
                angular.forEach($scope.data.config.tabs, function(tab) {
                  if (tab.open) result = tab;
                });
                return result;
              }

              function addAlert(data, text, type) {
                data.alert = {
                  text: text,
                  type: type || $scope.data.options.alertDangerClass
                };
              }

              function getOption() {
                var _options = angular.extend({}, defaultOptions, globalOptions, $scope.mxCheckoutOptions);
                var options = {
                  tabs: [],
                  ibank: [],
                  emoney: []
                };
                var config = mxCheckoutConfig.tabs;

                angular.forEach(_options.tabs, function(i) {
                  if (config.hasOwnProperty(i) && options.tabs.indexOf(i) < 0) options.tabs.push(i);
                });
                angular.forEach(_options.ibank, function(i) {
                  if (config.ibank.payment_systems.hasOwnProperty(i) && options.ibank.indexOf(i) < 0)
                    options.ibank.push(i);
                });
                angular.forEach(_options.emoney, function(i) {
                  if (config.emoney.payment_systems.hasOwnProperty(i) && options.emoney.indexOf(i) < 0)
                    options.emoney.push(i);
                });
                if (options.tabs.indexOf(_options.active) < 0) {
                  _options.active = options.tabs[0] || defaultOptions.active;
                }

                return angular.extend(_options, options);
              }
            }
          ],
          stop: function($event) {
            $event.preventDefault();
            $event.stopPropagation();
          }
        };
      }
    };
  })
  .factory('mxValidation', function() {
    var REGEX_NUM = /^[0-9]+$/,
      REGEX_EMAIL = /^[a-zA-Z0-9.!#$%&amp;'*+\-\/=?\^_`{|}~\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*$/,
      REGEX_NUM_DASHED = /^[\d\-\s]+$/,
      REGEX_URL = /^((http|https):\/\/(\w+:{0,1}\w*@)?(\S+)|)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/,
      REGEX_DEC = /^\-?[0-9]*\.?[0-9]+$/,
      REGEX_RULE = /^(.+?):(.+)$/,
      REGEXP_LUHN_DASHED = /^[\d\-\s]+$/;

    var _validation = {
      required: function(field) {
        var value = field.value;
        return !!value;
      },
      ccard: function(field) {
        if (!REGEXP_LUHN_DASHED.test(field.value)) return false;
        var nCheck = 0,
          nDigit = 0,
          bEven = false;
        var strippedField = field.value.replace(/\D/g, '');
        for (var n = strippedField.length - 1; n >= 0; n--) {
          var cDigit = strippedField.charAt(n);
          nDigit = parseInt(cDigit, 10);
          if (bEven) {
            if ((nDigit *= 2) > 9) nDigit -= 9;
          }
          nCheck += nDigit;
          bEven = !bEven;
        }
        return nCheck % 10 === 0;
      },
      num: function(field) {
        return REGEX_NUM.test(field.value);
      },
      min_length: function(field, length) {
        if (!REGEX_NUM.test(length)) return false;
        return field.value.length >= parseInt(length, 10);
      },
      cvv2: function(field) {
        return _validation.num.call(this, field) && _validation.min_length.call(this, field, 3);
      },
      expiry: function(month, year) {
        var currentTime, expiry;
        if (!(month && year)) {
          return false;
        }
        if (!/^\d+$/.test(month)) {
          return false;
        }
        if (!/^\d+$/.test(year)) {
          return false;
        }
        if (!(1 <= month && month <= 12)) {
          return false;
        }
        if (year.length === 2) {
          if (year < 70) {
            year = '20' + year;
          } else {
            year = '19' + year;
          }
        }
        if (year.length !== 4) {
          return false;
        }
        expiry = new Date(year, month);
        currentTime = new Date();
        expiry.setMonth(expiry.getMonth() - 1);
        expiry.setMonth(expiry.getMonth() + 1, 1);
        return expiry > currentTime;
      },
      exp_date: function(field) {
        return _validation.expiry.call(
          this,
          field.config.format === 'month' ? field.value : field.bind,
          field.config.format === 'year' ? field.value : field.bind
        );
      }
    };

    return {
      validate: function(value, valid, cb) {
        var result = _validation[valid](value);
        if (cb) {
          cb(result, valid);
        }
        return result;
      }
    };
  });

;
angular.module("mx/template/checkout/alert.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("mx/template/checkout/alert.html",
    "<div\n" +
    "        ng-if=\"$ctrl.alert.text\"\n" +
    "        class=\"alert {{$ctrl.alert.type}}\"\n" +
    "        role=\"alert\"\n" +
    ">\n" +
    "    <div class=\"alert-inner\">{{$ctrl.alert.text}}</div>\n" +
    "</div>\n" +
    "");
}]);

;
angular.module("mx/template/checkout/card.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("mx/template/checkout/card.html",
    "<form name=\"data.card.formCtrl\" ng-submit=\"formSubmit()\" novalidate>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "            <mx-alert alert=\"data.card.alert\"></mx-alert>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"col-xs-7 col-card\">\n" +
    "            <div mx-field-input=\"data.card\" config=\"data.config.fields.card\" blur=\"blur(inputCtrl, data.card)\" focus=\"focus(inputCtrl, data.card)\"></div>\n" +
    "        </div>\n" +
    "        <div class=\"col-xs-5\">\n" +
    "            <div class=\"row\">\n" +
    "                <div class=\"col-xs-6 col-expire-month\">\n" +
    "                    <div mx-field-input=\"data.card\" config=\"data.config.fields.expireMonth\" blur=\"blur(inputCtrl, data.card)\" focus=\"focus(inputCtrl, data.card)\"></div>\n" +
    "                </div>\n" +
    "                <div class=\"col-xs-6 col-expire-year\">\n" +
    "                    <div mx-field-input=\"data.card\" config=\"data.config.fields.expireYear\" blur=\"blur(inputCtrl, data.card)\" focus=\"focus(inputCtrl, data.card)\"></div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "    </div>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"col-xs-4 col-cvv\">\n" +
    "            <div mx-field-input=\"data.card\" config=\"data.config.fields.cvv\" blur=\"blur(inputCtrl, data.card)\" focus=\"focus(inputCtrl, data.card)\"></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <input type=\"submit\" style=\"position: absolute; left: -9999px; width: 1px; height: 1px;\" tabindex=\"-1\" />\n" +
    "</form>");
}]);

;
angular.module("mx/template/checkout/checkout.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("mx/template/checkout/checkout.html",
    "<div ng-transclude></div>\n" +
    "<div>\n" +
    "    <uib-accordion>\n" +
    "        <div\n" +
    "                uib-accordion-group\n" +
    "                class=\"panel {{::data.options.panelClass}}\"\n" +
    "                ng-repeat=\"tabId in ::data.options.tabs\"\n" +
    "                ng-init=\"tab = data.config.tabs[tabId]\"\n" +
    "                is-open=\"tab.open\"\n" +
    "                is-disabled=\"tab.open\"\n" +
    "        >\n" +
    "            <uib-accordion-heading ng-click=\"\">\n" +
    "                <span class=\"tab-icons\">\n" +
    "                    <i class=\"i i-{{::icon}}\" ng-repeat=\"icon in ::tab.icons\" ng-click=\"stop($event)\"></i>\n" +
    "                </span>\n" +
    "                {{::tab.name}}\n" +
    "            </uib-accordion-heading>\n" +
    "            <div  ng-include=\"'mx/template/checkout/' + tab.id + '.html'\"></div>\n" +
    "        </div>\n" +
    "    </uib-accordion>\n" +
    "    <div class=\"lock\"><i class=\"i i-lock\"></i> Your payment info is stored securely</div>\n" +
    "    <hr>\n" +
    "    <div class=\"text-right\"><button type=\"button\" class=\"btn {{::data.options.btnClass}}\" ng-click=\"formSubmit()\" ng-disabled=\"data.disabled\">Checkout</button></div>\n" +
    "</div>");
}]);

;
angular.module("mx/template/checkout/emoney.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("mx/template/checkout/emoney.html",
    "<form name=\"data.emoney.formCtrl\" ng-submit=\"formSubmit()\" novalidate>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "            <mx-alert alert=\"data.emoney.alert\"></mx-alert>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"payment-systems form-group\">\n" +
    "        <div class=\"payment-system\"\n" +
    "             ng-class=\"{\n" +
    "                active: tab.selected === id\n" +
    "             }\"\n" +
    "             ng-repeat=\"id in ::data.options.emoney\"\n" +
    "             ng-init=\"value = tab.payment_systems[id]\"\n" +
    "             ng-click=\"selectPaymentSystems(tab, id)\"\n" +
    "        >\n" +
    "            <div class=\"i-payment-system i-{{::id}}\"></div>\n" +
    "            <div>{{::value.name}}</div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div\n" +
    "            ng-if=\"tab.selected\"\n" +
    "            ng-repeat=\"id in tab.payment_systems[tab.selected].formMap\"\n" +
    "            mx-field-input=\"data.emoney\"\n" +
    "            config=\"data.config.fields[id]\"\n" +
    "            config=\"data.config.fields[id]\"\n" +
    "            blur=\"blur(inputCtrl, data.emoney)\"\n" +
    "            focus=\"focus(inputCtrl, data.emoney)\"\n" +
    "    ></div>\n" +
    "\n" +
    "    <input type=\"hidden\" ng-model=\"data.emoney.form.payment_system\" ng-required=\"true\">\n" +
    "    <input type=\"submit\" style=\"position: absolute; left: -9999px; width: 1px; height: 1px;\" tabindex=\"-1\"/>\n" +
    "</form>");
}]);

;
angular.module("mx/template/checkout/field-input.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("mx/template/checkout/field-input.html",
    "<div class=\"form-group\"\n" +
    "     ng-class=\"{\n" +
    "                'has-error': model.valid.iconShow[config.id],\n" +
    "                'has-success': model.formCtrl[config.id].$valid\n" +
    "            }\"\n" +
    ">\n" +
    "    <label\n" +
    "            ng-if=\"::config.label\"\n" +
    "    ><span>{{::config.text}}&nbsp;</span>\n" +
    "        <i ng-if=\"::config.info\" class=\"i i-i\" uib-tooltip=\"{{::config.info}}\" tooltip-placement=\"right\" tooltip-append-to-body=\"true\"></i>\n" +
    "    <input\n" +
    "\n" +
    "            name=\"{{::config.id}}\"\n" +
    "            ng-model=\"model.form[config.id]\"\n" +
    "            type=\"tel\"\n" +
    "            class=\"{{::config.formControlClass}}\"\n" +
    "\n" +
    "            placeholder=\"{{::config.placeholder}}\"\n" +
    "            ng-pattern=\"::config.pattern\"\n" +
    "\n" +
    "            size=\"{{::config.size}}\"\n" +
    "            maxlength=\"{{::config.size}}\"\n" +
    "            autocomplete=\"off\"\n" +
    "            mx-auto-focus=\"model.valid.autoFocus[config.id]\"\n" +
    "\n" +
    "            model=\"model.form\"\n" +
    "            config=\"config\"\n" +
    "            mx-field-valid=\"model.valid\"\n" +
    "            bind=\"{{model.form[config.bind]}}\"\n" +
    "\n" +
    "            ng-blur=\"blur({inputCtrl: model.formCtrl[config.id]})\"\n" +
    "            ng-focus=\"focus({inputCtrl: model.formCtrl[config.id]})\"\n" +
    "\n" +
    "            uib-tooltip=\"{{model.valid.errorText[config.id]}}\"\n" +
    "            tooltip-placement=\"right\"\n" +
    "            tooltip-trigger=\"{'mouseenter': 'mouseleave', 'none': 'focus'}\"\n" +
    "            tooltip-enable=\"{{model.valid.iconShow[config.id]}}\"\n" +
    "            tooltip-append-to-body=\"true\"\n" +
    "            tooltip-class=\"{{::config.tooltipClass}}\"\n" +
    "            tooltip-animation=\"false\"\n" +
    "    >\n" +
    "    </label>\n" +
    "</div>");
}]);

;
angular.module("mx/template/checkout/ibank.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("mx/template/checkout/ibank.html",
    "<form name=\"data.ibank.formCtrl\" ng-submit=\"formSubmit()\" novalidate>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"col-xs-12\">\n" +
    "            <mx-alert alert=\"data.ibank.alert\"></mx-alert>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"payment-systems form-group\">\n" +
    "        <div class=\"payment-system\"\n" +
    "             ng-class=\"{\n" +
    "                active: tab.selected === id\n" +
    "             }\"\n" +
    "             ng-repeat=\"id in ::data.options.ibank\"\n" +
    "             ng-init=\"value = tab.payment_systems[id]\"\n" +
    "             ng-click=\"selectPaymentSystems(tab, id)\"\n" +
    "        >\n" +
    "            <div class=\"i-payment-system i-{{::id}}\"></div>\n" +
    "            <div>{{::value.name}}</div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div\n" +
    "            ng-if=\"tab.selected\"\n" +
    "            ng-repeat=\"id in tab.payment_systems[tab.selected].formMap\"\n" +
    "            mx-field-input=\"data.ibank\"\n" +
    "            config=\"data.config.fields[id]\"\n" +
    "            blur=\"blur(inputCtrl, data.ibank)\"\n" +
    "            focus=\"focus(inputCtrl, data.ibank)\"\n" +
    "    ></div>\n" +
    "\n" +
    "    <input type=\"hidden\" ng-model=\"data.ibank.form.payment_system\" ng-required=\"true\">\n" +
    "    <input type=\"submit\" style=\"position: absolute; left: -9999px; width: 1px; height: 1px;\" tabindex=\"-1\"/>\n" +
    "</form>");
}]);

})();