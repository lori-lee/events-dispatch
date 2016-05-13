/**
 * Events Primary Dispatcher.(A Simple Framework of Events Delegation)
 *
 * @Author: lori@flashbay.com
 *
 **/
var EventDispatcher = null;
var eventManager    = null;
+function ($) {
    'use strict';

    EventDispatcher = function () {
        if (!(this instanceof EventDispatcher)) {//Function call
            return new EventDispatcher();
        } else {//new object
            this._init();
        }
    };
    //
    EventDispatcher.prototype._init = function () {
        this._delegations = {
            DOMPathSet: {},//reverse path of each target
            handlers:{},//the map of elements mark <-> handlers, e.g. format: ['handler_1']['mouseover'] = [function(ev){}, function(ev){....}]
            handlerRefCnt: {},//Reference counter of handlers, for garbage collection. e.g. format: ['handler_2']['click'] = 10
            DOMPathSetNoHandlers: {}//
        };
        //
        this._eventsObserve = [
            'click'//, 'change', 'focus', 'mouseover'
        ];
        //Indicate whether method run is called or not, avoid duplicated event binding.
        this._bindAlready = false;
        //Handler Primary Entry
        this._handlerEntry= null;//this._dispatcher.bind(this);
        //
        return this;
    };
    //
    EventDispatcher.prototype._removeRedundantSpace = function (str) {
        if ('string' === typeof str) {
            return str.replace(/\s{2,}/g, ' ').replace(/^\s+|\s+$/g, '');
        } else if ('object' === typeof str) {
            for (var i in str) {
                str[i] = this._removeRedundantSpace(str[i]);
            }
        }
        //
        return str;
    };
    //
    EventDispatcher.prototype._getDOMPath = function (DOMElementNode) {
        var _path = [];
        //
        while (DOMElementNode instanceof HTMLElement) {
            _path.push(DOMElementNode.hasOwnProperty('tagName') ? DOMElementNode.tagName : DOMElementNode.nodeName);
            DOMElementNode = DOMElementNode.hasOwnProperty('parentElement') ? DOMElementNode.parentElement : DOMElementNode.parentNode;
        }
        //
        return _path;
    };
    /**
     * Get DOMElementNode's targets
     *
     **/
    EventDispatcher.prototype._getDOMTargets = function (DOMElementNode) {
        var _path = this._getDOMPath(DOMElementNode);
        var _pathStr = JSON.stringify(_path);
        var _target  = [];
        //
        if (this._delegations['DOMPathSet'][_pathStr]) {
            for (var i = 0; i < this._delegations['DOMPathSet'][_pathStr].length; ++i) {
                var _targetCandidate = this._delegations['DOMPathSet'][_pathStr][i];
                var _elemSet = document.querySelectorAll(_targetCandidate);
                //
                for (var j = 0; j < _elemSet.length; ++j) {//Recheck to confirm the DOMElementNode belongs to the potential targets.
                    if (_elemSet[j] === DOMElementNode) {
                        _target.push(_targetCandidate);
                    }
                }
            }
        }
        //
        return _target;
    };
    // 
    EventDispatcher.prototype._getDOMHandlers = function (DOMElementNode, eventName) {
        var _targets;
        var _handlers = [];
        //
        eventName = eventName.toLowerCase();
        _targets  = this._getDOMTargets(DOMElementNode);
        for (var i = 0; i < _targets.length; ++i) {
            if ('*' === eventName || this._delegations['handlers'][_targets[i]][eventName]) {
               _handlers = _handlers.concat(this._delegations['handlers'][_targets[i]][eventName]);
            }
        }
        //
        return _handlers;
    };
    //
    EventDispatcher.prototype.attach = function (eventName, target, handler) {
        if (!!eventName && !!target
            && !!handler && 'function' === typeof handler) {
            //
            if ('string' === typeof target) {
                target = target.split(',');
            }
            if (!!Array.isArray && Array.isArray(target)
                && !!document.querySelectorAll && target.length) {
                //
                target    = this._removeRedundantSpace(target);
                eventName = eventName.toLowerCase();
                //
                for (var i = 0; i < target.length; ++i) {
                    var _current = target[i];
                    //
                    var _DOMNodesRelated = document.querySelectorAll(_current);
                    //
                    if (_DOMNodesRelated.length) {
                        this._delegations['handlers'][_current] = this._delegations['handlers'][_current] || {};
                        this._delegations['handlers'][_current][eventName] = this._delegations['handlers'][_current][eventName] || [];
                        if (-1 === this._delegations['handlers'][_current][eventName].indexOf(handler)) {//Avoid identical handler being attached multi-times
                            this._delegations['handlers'][_current][eventName].push(handler);
                        }
                        //
                        this._delegations['handlerRefCnt'][_current] = this._delegations['handlerRefCnt'][_current] || {};
                        this._delegations['handlerRefCnt'][_current][eventName] = _DOMNodesRelated.length;
                        //
                        for (var j = 0; j < _DOMNodesRelated.length; ++j) {
                            var _path = this._getDOMPath(_DOMNodesRelated[j]);
                            var _pathStr = JSON.stringify(_path);
                            //
                            this._delegations['DOMPathSet'][_pathStr] = this._delegations['DOMPathSet'][_pathStr] || [];
                            if (-1 === this._delegations['DOMPathSet'][_pathStr].indexOf(_current)) {
                                this._delegations['DOMPathSet'][_pathStr].push(_current);
                            }
                        }
                    } else {//No Related DOM Nodes Found.
                        //Just Ignore
                    }
                }
            }
        }
        //
        return this;
    };
    //@TODO
    EventDispatcher.prototype._removeHandler = function (DOMElement, eventName, handler) {
        eventName = eventName.toLowerCase();
        if ('string' === typeof eventName && 'string' === typeof handlerMark
            && !!this._delegations['handlers'][handlerMark]
            && !!this._delegations['handlers'][handlerMark][eventName]) {
            // 
        }
        //
        return this;
    };
    //@TODO
    EventDispatcher.prototype.unattach = function (eventName, target, handler) {
        var handlersMark = '';

        if ('string' === typeof eventName) {
            eventName = eventName.toLowerCase();
            if ('string' === typeof target && !!document.querySelectorAll) {
                var DOMNodesRelated = document.querySelectorAll(target);

                if (!!Array.isArray && Array.isArray(DOMNodesRelated) && DOMNodesRelated.length) {
                    for (var i = 0; i < DOMNodesRelated.length; ++i) {
                        this.unattach(eventName, DOMNodesRelated[i], handler);
                    }
                }
            } else if (target instanceof $) {
                handlersMark = target.attr(this._handlerAttr);
            } else if (target instanceof HTMLElement) {
                handlersMark = target.getAttribute(this._handlerAttr);
            }
            if (!!handlersMark && !!this._delegations['handlers'][handlersMark]) {
                //
                if ('*' === eventName) {
                    var allEvents = Object.keys(this._delegations['handlers'][handlersMark]);
                    // 
                    for (var i = 0; i < allEvents.length; ++i) {
                        this._removeHandler(allEvents[i], handlersMark, handler);
                    }
                } else {
                    this._removeHandler(eventName, handlersMark, handler);
                }
            }
        }
        //
        return this;
    };
    /**
     * Unbind all events
     *
     **/
    EventDispatcher.prototype.unbindAll = function () {
        if (this._bindAlready) {
            this._bindAlready = false;
            this._unbindEvents(this._eventsObserve);
        } else {
            this._eventsObserve = [];
        }
        //
        return this;
    };
    /**
     * Bind the events specified
     *
     **/
    EventDispatcher.prototype._bindEvents = function (events) {
        if (null === this._handlerEntry) {
            this._handlerEntry = this._dispatcher.bind(this);
        }
        if (Array && Array.isArray(events)) {
            if (document.addEventListener) {
                for (var i = 0; i < events.length; ++i) {
                    events[i].length && document.addEventListener(events[i], this._handlerEntry, false);
                }
            } else if (document.attachEvent){//
                //@TODO
            }
        }
        //
        return this;
    };
    /**
     * Unbind the events specified
     *
     **/
    EventDispatcher.prototype._unbindEvents = function (events) {
        if (null === this._handlerEntry) {
            this._handlerEntry = this._dispatcher.bind(this);
        }
        if (Array && Array.isArray(events)) {
            if (document.removeEventListener) {
                for (var i = 0; i < events.length; ++i) {
                    events[i].length && document.removeEventListener(events[i], this._handlerEntry, false);
                }
            } else if (document.dettachEvent){//
                //@TODO
            }
        }
        //
        return this;
    };

    /**
     * Bind all the events attached to observing list.
     *
     **/
    EventDispatcher.prototype.run = function () {
        //
        if (false === this._bindAlready) {
            this._bindAlready = true;
            this._bindEvents(this._eventsObserve);
        }
        //
        return this;
    };
    //
    EventDispatcher.prototype._isDOMEventRemoved = function (DOMElement, eventName) {
        var _path = this._getDOMPath(DOMElement);
        var _pathStr = JSON.stringify(_path);
        //
        eventName = eventName.toLowerCase();
        //
        return this._delegations['DOMPathSetNoHandlers'][_pathStr] && this._delegations['DOMPathSetNoHandlers'][_pathStr][eventName]
               && -1 !== this._delegations['DOMPathSetNoHandlers'][_pathStr][eventName].indexOf(DOMElement);
    };
    /**
     * Primary Events Entry
     *
     **/
    EventDispatcher.prototype._dispatcher = function (ev) {
        var _eventName = ev.type.toLowerCase();
        var _handlers  = this._getDOMHandlers(ev.target, _eventName);
        //
        for (var i = 0; i < _handlers.length; ++i) {//Call Stack Chain of Handlers
            var _handler = _handlers[i];
            //
            _handler(ev);
        }
        //
        return this;
    };
    /**
     * Add events for observing.
     *
     * @param <string> events  -- format: event_name1, event-name2...
     *
     **/
    EventDispatcher.prototype.addObserveEvents = function (events) {
        if ('string' === typeof events) {
            events = events.toLowerCase().split(/,| /);
        }
        //
        if (!!Array.isArray && Array.isArray(events)) {
            events = this._removeRedundantSpace(events);
            for (var i = 0; i < events.length; ++i) {
                if (-1 == this._eventsObserve.indexOf(events[i])) {
                    this._eventsObserve.push(events[i]);
                } else {
                    events.splice(i);
                }
            }
        }
        if (this._bindAlready) {//Old observing events already bound, bind directly.
            this._bindEvents(events);
        }
        //
        return this;
    };
    /**
     * Remove events for observing.
     *
     * @param <string> events  -- format: event_name1, event-name2...
     *
     **/
    EventDispatcher.prototype.removeObserveEvents = function (events) {
        if ('string' === typeof events) {
            events = events.toLowerCase().split(/,| /);
        }
        if (!!Array.isArray && Array.isArray(events)) {
            events = this._removeRedundantSpace(events);
            for (var i = 0; i < events.length; ++i) {
                var j = this._eventsObserve.indexOf(events[i]);
                //
                if (j >= 0) {
                    this._eventsObserve.splice(j);
                } else {
                    events.splice(i);
                }
            }
        }
        if (this._bindAlready) {
            this._unbindEvents(events);
        }
        //
        return this;
    };
    //
    EventDispatcher.prototype.trigger = function (eventName, target) {
        eventName = eventName.toLowerCase();
        var event = new CustomEvent(eventName, {bubbles: true});
        //
        if ('string' === typeof target) {
            var targets = document.querySelectorAll(target);
            for (var i = 0; i < targets.length; ++i) {
                targets[i].dispatchEvent(event);
            }
        } else if (target instanceof HTMLElement) {
            target.dispatchEvent(event);
        } else {
            document.dispatchEvent(event);
        }
        //
        return this;
    };
    //
    EventDispatcher.prototype.setEventsObserve = function (events) {
        //
        if ('string' === typeof events) {
            events = events.split(/,| /);
        }
        if (Array.isArray(events)) {
            events = this._removeRedundantSpace(events);
            for (var i = 0; i < events.length; ++i) {
                if (!events.length) {
                    events.splice(i);
                }
            }
            this._eventsObserve = events;
            this._bindAlready   = false;
        }
        //
        return this;
    };
    //
    EventDispatcher.prototype.getEventsObserve = function () {
        //
        return this._eventsObserve;
    };
    //
    eventManager = eventManager || new EventDispatcher();
    eventManager.run();
}(window.jQuery);
