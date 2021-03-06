/**
 * Copyright (C) 2011 by Pieter Vogelaar (pietervogelaar.nl) and Kees Schepers (keesschepers.nl)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @category   PiKe
 * @copyright  Copyright (C) 2011 by Pieter Vogelaar (pietervogelaar.nl) and Kees Schepers (keesschepers.nl)
 * @author     Nico Vogelaar
 * @license    MIT
 */
(function ($) {
    if (typeof $.jgrid.pike == 'undefined') {
        $.jgrid.pike = {};
    }

    $.jgrid.pike.history = {
        /**
         * Params to store in hash
         */
        params : ["page", "rowNum", "sortname", "sortorder"],

        /**
         * Store filters in hash
         */
        filters : true,

        /**
         * Use prefix for params in hash
         */
        prefix : false,

        /**
         * Defaults
         */
        defaults : [],

        /**
         * Push state
         */
        pushState : false,

        /**
         * Returns the options for the grid with a new gridComplete callback function
         *
         * @param options
         */
        getOptions : function(options) {
            var self = this;

            var gridComplete = options.gridComplete;
            options.gridComplete = function() {
                if (undefined !== gridComplete) {
                    gridComplete.call();
                }
                self.gridComplete();
            }

            return options;
        },

        /**
         * Returns all grids from the current page
         */
        getGrids : function() {
            return $('.ui-jqgrid-btable');
        },

        /**
         * Sets the default params of a grid
         *
         * @param grid
         */
        setDefaults : function(grid) {
            var defaults = [];
            for (var i in this.params) {
                defaults[this.params[i]] = grid.getGridParam(this.params[i]);
            }
            this.defaults[grid.getGridParam('id')] = defaults;
        },

        /**
         * Grid complete callback function
         */
        gridComplete : function() {
            this.buildHash();
        },

        /**
         * Build the hash by adding the params and filters to the hash
         */
        buildHash : function() {
            var self = this;
            var hash = $.bbq.getState();
            this.getGrids().each(function() {
                var grid = $(this);
                var id = grid.getGridParam('id');

                if (undefined !== self.defaults[id]) {
                    if ('local' != grid.getGridParam('datatype')) {
                        self.addParamsToHash(hash, grid);

                        if (self.filters) {
                            self.addFiltersToHash(hash, grid);
                        }
                    }
                }
            });

            if (this.pushState) {
                $.bbq.pushState(hash, 2);
                this.pushState = false;
            }
        },

        /**
         * Adds the params to the hash
         *
         * @param hash
         * @param grid
         */
        addParamsToHash : function(hash, grid) {
            var id = grid.getGridParam('id');
            var i, param, value;
            var prefix = (this.prefix ? id + '-' : '');

            for (i in this.params) {
                param = this.params[i];
                value = grid.getGridParam(param);
                if (value != this.defaults[id][param]) {
                    param = prefix + param;
                    if (value != hash[param]) {
                        hash[param] = value;
                        this.pushState = true;
                    }
                } else {
                    param = prefix + param;
                    if (hash[param]) {
                        delete hash[param];
                        this.pushState = true;
                    }
                }
            }
        },

        /**
         * Adds the filters to the hash
         *
         * @param hash
         * @param grid
         */
        addFiltersToHash : function(hash, grid) {
            var id = grid.getGridParam('id');
            var prefix = (this.prefix ? id + '-' : '');
            var param = prefix + 'filters';

            if (true === grid.getGridParam('search')) {
                var filters = grid.getGridParam('postData').filters;
                if (filters != hash[param]) {
                    hash[param] = filters;
                    this.pushState = true;
                }
            } else {
                if (hash[param]) {
                    delete hash[param];
                    this.pushState = true;
                }
            }
        },

        /**
         * Bind the hashchange event to the window
         */
        bindHashchangeEventToWindow : function() {
            var self = this;
            $(window).bind('hashchange', function() {
                self.hashchangeHandler();
            });
        },

        /**
         * Hashchange event handler
         */
        hashchangeHandler : function() {
            var self = this;
            var hash = $.bbq.getState();

            this.getGrids().each(function() {
                var grid = $(this);
                var id = grid.getGridParam('id');
                var params = new Array();
                var reload = false;

                if (undefined !== self.defaults[id]) {
                    reload = self.handleParams(params, hash, grid) || reload;
                    if (self.filters) {
                        reload = self.handleFilters(params, hash, grid) || reload;
                    }

                    if (reload) {
                        grid.setGridParam(params).trigger('reloadGrid');
                    }
                }
            });
        },


        /**
         * Returns the visible filter toolbar input fields for a grid
         *
         * @param grid
         */
        getFilterToolbarInputFields : function(grid) {
            return grid.closest('.ui-jqgrid')
            .find('.ui-search-toolbar input[id^="gs_"]:visible');
        },

        /**
         * Sets the visible filter toolbar input fields with the correct values
         *
         * @param filters
         * @param grid
         */
        setFilterToolbarInputFields : function(filters, grid) {
            this.getFilterToolbarInputFields(grid).each(function() {
                var field = $(this).attr('name');
                var value = '';
                if (null !== filters && filters.rules.length > 0) {
                    for (var i in filters.rules) {
                        if (field == filters.rules[i].field) {
                            value = filters.rules[i].data;
                            continue;
                        }
                    }
                }
                $(this).val(value);
            });
        },

        /**
         * Handles the params from the hash
         *
         * @param  params
         * @param  hash
         * @param  grid
         * @return boolean  Reload needed?
         */
        handleParams : function(params, hash, grid) {
            var id = grid.getGridParam('id');
            var prefix = (this.prefix ? id + '-' : '');
            var i, param, value, reload = false;

            for (i in this.params) {
                param = this.params[i];
                value = hash[prefix + param] || this.defaults[id][param];
                if (grid.getGridParam(param) != value) {
                    params[param] = value;
                    reload = true;
                }
            }

            return reload;
        },

        /**
         * Handles the filters from the hash
         *
         * @param  params
         * @param  hash
         * @param  grid
         * @return boolean  Reload needed?
         */
        handleFilters : function(params, hash, grid) {
            var id = grid.getGridParam('id');
            var prefix = (this.prefix ? id + '-' : '');
            var filters = $.parseJSON(grid.getGridParam('postData').filters);
            var hashFilters = $.parseJSON(hash[prefix + 'filters']);
            var reload = false;

            if (null !== filters) {
                reload = this.deleteFilters(filters, hashFilters) || reload;
                if (null !== hashFilters) {
                    reload = this.addFilters(filters, hashFilters) || reload;
                }
            } else if (null !== hashFilters) {
                filters = hashFilters;
                reload = true;
            }

            if (filters) {
                params['search'] = true;
                params['postData'] = {
                    filters : JSON.stringify(filters)
                };
            }

            this.setFilterToolbarInputFields(filters, grid);

            return reload;
        },

        /**
         * Deletes the filters that are not in the hash
         *
         * @param  filters
         * @param  hashFilters
         * @return boolean  Reload needed?
         */
        deleteFilters : function(filters, hashFilters) {
            var i, x, found, reload = false;

            for (i in filters.rules) {
                found = false;
                if (null !== hashFilters) {
                    for (x in hashFilters.rules) {
                        if (filters.rules[i].field == hashFilters.rules[x].field) {
                            found = true;
                            continue;
                        }
                    }
                }
                if (!found) {
                    filters.rules.splice(i, 1);
                    reload = true;
                }
            }

            return reload;
        },

        /**
         * Adds the filters from the hash that are not already in the filters object
         *
         * @param  filters
         * @param  hashFilters
         * @return boolean  Reload needed?
         */
        addFilters : function(filters, hashFilters) {
            var i, x, value, hashValue, found, reload = false;

            for (i in hashFilters.rules) {
                found = false;
                for (x in filters.rules) {
                    if (hashFilters.rules[i].field == filters.rules[x].field) {
                        value = filters.rules[x].data;
                        hashValue = hashFilters.rules[i].data;
                        if (value != hashValue) {
                            filters.rules[x].data = hashValue;
                            reload = true;
                        }
                        found = true;
                        continue;
                    }
                }
                if (!found) {
                    filters.rules.push(hashFilters.rules[i]);
                    reload = true;
                }
            }

            return reload;
        }
    };

    /**
     * jqGridHistory function
     *
     * @param options
     */
    $.fn.jqGridHistory = function(options) {
        var datatype = options.datatype;
        if ('' != datatype) {
            options.datatype = 'local';
        }

        this.jqGrid($.jgrid.pike.history.getOptions(options));
        $.jgrid.pike.history.bindHashchangeEventToWindow();
        $.jgrid.pike.history.setDefaults(this);

        var self = this;
        $(this).ready(function() {
            $.jgrid.pike.history.hashchangeHandler();
            if ('' != datatype) {
                self.setGridParam({
                    datatype: datatype
                });
            }

            self.trigger('reloadGrid');
        });
        return this;
    };
})(jQuery);