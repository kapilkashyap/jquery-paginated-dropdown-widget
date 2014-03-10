/*
 * jQuery Paginated Drop Down UI Widget 1.0
 * Copyright (c) 2012 Kapil Kashyap
 *
 * Depends:
 *   - jQuery 1.6+
 *   - jQuery UI 1.8 widget factory
 *   - jQuery Filter Json plugin // optional
 *
 * Dual licensed under the MIT and GPL licenses:
 *   - http://www.opensource.org/licenses/mit-license.php
 *   - http://www.gnu.org/licenses/gpl.html
 */
(function($) {
	$.widget( "kk.paginateddropdown", {
		// default options
	    options: {
	    	url: null,
	    	itemTemplate: null,
			valueProperty: null,
			itemsPerPage: 10,
			dropdownWidth: null,
			elementType: "text",
			persistState: false,
			closeBtnRequired: true,
			footerRequired: true,
			keyNavigation: {
				up_down: true,
				next_prev: true
			},
			customEventPrefix: null,
			filterJSON: null,
			cache: false
	    },
	    _create: function() {
	    	var wrapper = null,
	    		ipp = null,
	    		ddw = 0;

	    	// set widget properties
	    	this._setWidgetProperties();

	    	// create a wrapper for the target element
	    	wrapper = $( "<div></div>" ).addClass( this.wp.widgetBaseClass + this.wp.hyphen + this.options.elementType + this.wp.hyphen + this.wp.wrapperLabel );
	    	// wrap the element with the wrapper
	    	this.element.wrap( wrapper.width(parseInt(this.element.css("width"), 10) + (!!window.ActiveXObject ? 2 : 0)));

	    	// set widget state
	    	this._setWidgetState();

	    	// add widget base class
	    	this.element.addClass( this.wp.widgetBaseClass );

	        // if dropdown width is specified use that, else calculate dropdown width dynamically.
	        if(this.options.dropdownWidth) {
	        	ddw = parseInt(this.options.dropdownWidth, 10);
	        	this.options.dropdownWidth = ddw ? ddw : 0;
	        }

	        ipp = parseInt(this.options.itemsPerPage, 10);
	        if(!ipp || ipp <= 0) {
	        	this.options.itemsPerPage = 10;
	        }

        	// bind various events to the element
	        this._bindEvents();

        	// create a template for the paginated drop down footer
	        this._constructPaginationFooterTemplate();
	    },
	    _init: function(config) {
	    	config = config || this.options;
	    	$.ajaxSetup({cache: config.cache});
	    	// Check if the dependencies are loaded
	    	this._checkDependencies();
	    },
	    _checkDependencies: function() {
	    	if(this.options.filterJSON && !$.fn.filterJSON) {
	    		var errMsg = "jQuery filter json plugin is required.";
	    		if(window.console) {
	    			console.error( errMsg, this.element.context );
	    			return;
	    		}
	    		alert( errMsg );
	    	}
	    },
	    _setWidgetProperties: function() {
	    	if(this.options.customEventPrefix) {
	    		this.widgetEventPrefix = this.options.customEventPrefix;
	    	}
	    	this.wp = {};
	    	this.wp.widgetBaseClass 		= "paginateddropdown";
	    	this.wp.selectedItemClass 		= "selected-item";
	    	this.wp.space 					= " ";
	    	this.wp.hyphen 					= "-";
	    	// labels
	    	this.wp.ofLabel 				= "of"; // This should be internationalised
	    	this.wp.wrapperLabel 			= "wrapper";
	    	this.wp.containerLabel 			= "container";
	    	this.wp.itemLabel 				= "item";
	    	this.wp.footerLabel 			= "footer";
	    	this.wp.footerContentLabel 		= "footer-content";
	    	this.wp.footerInfoLabel 		= "footer-info";
	    	this.wp.footerLeftNavLabel 		= "footer-left-nav";
	    	this.wp.footerRightNavLabel 	= "footer-right-nav";
	    	this.wp.closeBtnLabel 			= "close-button";
	    	// custom events
	    	this.wp.itemSelectedEvent 		= "itemselected";
	    },
	    _bindEvents: function() {
	    	var self = this,
	    		el = self.element;

	    	if(self.options.elementType && self.options.elementType == "text") {
				el.keydown(function( event ) {
					self._keyNavigations( event );
				});

				el.keypress(function( event ) {
					if(event.keyCode == 13) {
						event.preventDefault();
	    				if($( el.parent().find( "." + self.wp.selectedItemClass ) ).length > 0) {
	    					self._itemSelection(event);
	    				}
	    				return;
					}
				});

	    		el.keyup(function( event ) {
	    			// clean up the dropdown and return, if input element is empty or Esc key is pressed.
	    			if(el.val() == "" || event.keyCode == 27) {
	    				if(el.val() == "" || !self.options.persistState) {
	    					self._resetWidgetState();
	    				}
	    				self._cleanup();
	    				return;
	    			}
    				self._fetchData( $.trim(el.val()) );
	    		});
	    	}
	    	else if(self.options.elementType && self.options.elementType == "link") {
	    		el.click(function( event ) {
	    			self._fetchData();
	    		});
	    		el.keyup(function( event ) {
	    			if(event.keyCode == 27) {
	    				if(!self.options.persistState) {
	    					self._resetWidgetState();
	    				}
	    				self._cleanup();
	    			}
	    		});
	    	}

			// remove the dropdown and clean up the dom.
			el.blur(function( event ) {
				setTimeout(function() {
					if(el.is(":focus")) {
						return false;
					}
					if(!self.options.persistState) {
						self._resetWidgetState();
					}
					self._cleanup();
				}, 200);
			});
	    },
	    _updateContent: function(o) {
	    	var el = this.element;
			if(this.options.valueProperty) {
				if($.type(o) == "object") {
					el.val( $.type(this.options.valueProperty) == "array" ? o[this.options.valueProperty[0]] : o[this.options.valueProperty] ).focus();
				}
				else {
					el.val( o ).focus();
				}
			} else {
				el.val( $( el.parent().find( "." + this.wp.selectedItemClass ) ).text() ).focus();
			}
	    },
	    _keyNavigations: function(event) {
			var self = this,
				el = self.element,
				selectedItem = $( el.parent().find( "." + self.wp.selectedItemClass ) ),
				newItemIndex = null,
				highlightItemIndex = null;

			if(self._getWidgetState().html) {
				if(self.options.keyNavigation.next_prev && event.keyCode == 37) {
					//event.preventDefault();
					self._prevPage(event, self);
					return;
				}
				else if(self.options.keyNavigation.next_prev && event.keyCode == 39) {
					//event.preventDefault();
					self._nextPage(event, self);
					return;
				}
				else if(self.options.keyNavigation.up_down && event.keyCode == 38) {
					event.preventDefault();
					highlightItemIndex = self._getWidgetState().endIndex - self._getWidgetState().startIndex + 1;
					newItemIndex = selectedItem.prev().index();
					
					if(newItemIndex != -1) {
						highlightItemIndex = newItemIndex + 1;
					}
					self._highlightItem( highlightItemIndex );
					return;
				}
				else if(self.options.keyNavigation.up_down && event.keyCode == 40) {
					event.preventDefault();
					highlightItemIndex = 1;
					newItemIndex = selectedItem.next().hasClass( self.wp.widgetBaseClass + self.wp.hyphen + self.wp.footerLabel ) ? -1 : selectedItem.next().index();
					
					if(newItemIndex != -1) {
						highlightItemIndex = newItemIndex + 1;
					}
					self._highlightItem( highlightItemIndex );
					return;
				}
			}
	    },
	    _itemSelection: function(event) {
	    	this._updateContent(this._getSelectedItemObject());
	    	this._cleanup();
	    	this._fireEvent(this.wp.itemSelectedEvent, event);
	    },
	    _nextPage: function(e, self) {
	    	var widgetState = self._getWidgetState();
	    	self.element.focus();
    		if(widgetState.page < widgetState.maximumNumberOfPages) {
    			widgetState.page++;
    			self._paginate();
    			self.element.parent().find( "." + self.wp.widgetBaseClass + self.wp.hyphen + self.wp.containerLabel ).html( widgetState.html );
    			self._updateFooterInfo();
    			self._bindDropdownComponentEvents();
    			self._highlightItem(1);
    			self._markAllItems();
    		}
    	},
    	_prevPage: function(e, self) {
    		var widgetState = self._getWidgetState();
    		self.element.focus();
    		if(widgetState.page > 1) {
    			widgetState.page--;
    			self._paginate();
    			self.element.parent().find( "." + self.wp.widgetBaseClass + self.wp.hyphen + self.wp.containerLabel ).html( widgetState.html );
    			self._updateFooterInfo();
    			self._bindDropdownComponentEvents();
    			self._highlightItem(1);
    			self._markAllItems();
    		}
    	},
	    _fetchData: function(query) {
	    	var self = this,
	    		widgetState = self._getWidgetState();

	    	if(self.options.url) {
	    		widgetState.query = query;
	    		$.getJSON(self.options.url, {"q": query}, function( data ) {
	    			var filteredJson = null;
	    			if(self.options.filterJSON && $.fn.filterJSON) {
	    				filteredJson = $.fn.filterJSON( data, $.extend({
	    															property: self.options.valueProperty,
	    															value: query,
	    															checkContains: true,
	    															wrapper: true
	    														}, self.options.filterJSON));
	    			}
	    			widgetState.fetchedData = widgetState.data = filteredJson ? filteredJson : data;
	    			self._constructDropDown();
	    		});
	    	}
	    },
	    _constructDropDown: function() {
	    	var data = this._getWidgetState().data;

	    	this._cleanup();
			if(data == null || data.length == 0) {
				this._resetWidgetState();
				return;
			};
			// if we have specified a template, then construct the html structure using the template.
			if(this.options.itemTemplate) {
				this._getWidgetState().data = this._constructHtmlUsingTemplate();
			}
			this._paginate();
			this._createDropdownComponents();
			this._updateFooterInfo();
			this._bindDropdownComponentEvents();
			this._highlightItem(this._getWidgetState().highlightedIndex);
			this._markAllItems();
			this.element.parent().find( "." + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.containerLabel ).show();
	    },
	    _constructHtmlUsingTemplate: function() {
	    	var self = this,
	    		data = self._getWidgetState().data,
	    		constructedTemplate = [],
	    		widgetState = self._getWidgetState(),
	    		matchedText = null,
	    		underlinedText = null,
	    		highlightRegExp = new RegExp($.ui.autocomplete.escapeRegex(widgetState.query), "i"),
	    		highlightQueryText = function(text) {
		    		underlinedText = "";
	    			matchedText = text.match(highlightRegExp);
	    			if(matchedText && matchedText.length > 0) {
	    				underlinedText = "<u>" + matchedText.join("") + "</u>";
	    			}
	    			return text.replace(highlightRegExp, underlinedText);
	    		};
	    	
	    	if(!data) {
				var errorMsg = "data is required.";
				if(window.console) {
					console.error ? console.error( errorMsg ) : console.log( errorMsg );
					return;
				}
				alert( errorMsg );
				return;
			}
	    	
			$( data ).each(function(index, item) {
				var templateClone = $( "<div></div>" ).html( self.options.itemTemplate ).html();
				if($.type(item) == "object") {
					$.each(item, function(k, v) {
						var templateKey = "{@:" + k + "}",
							regEx = new RegExp($.ui.autocomplete.escapeRegex(templateKey), "g");
						
						if(self.options.itemTemplate.indexOf( templateKey ) != -1) {
							if($.type(self.options.valueProperty) == "array") {
								templateClone = templateClone.replace( regEx, (self.options.valueProperty.indexOf(k) != -1) ? highlightQueryText(v) : v );
							}
							else {
								templateClone = templateClone.replace( regEx, (k == self.options.valueProperty) ? highlightQueryText(v) : v );
							}
						}
					});
				}
				else {
					var templateKey = "{@:" + self.options.valueProperty + "}",
						regEx = new RegExp($.ui.autocomplete.escapeRegex(templateKey), "g");
					
					if(self.options.itemTemplate.indexOf( templateKey ) != -1) {
						templateClone = templateClone.replace( regEx, (k == self.options.valueProperty) ? highlightQueryText(item) : item );
					}
				}
				constructedTemplate.push( templateClone );
			});
			return constructedTemplate;
		},
		_paginate: function() {
			var self = this,
				widgetState = self._getWidgetState(),
				ipp = self.options.itemsPerPage,
				threshold = null,
				paginatedItems = [];

			if(widgetState.data && widgetState.data.length) {
				// reset the page in case there is a change in the length of fetched results
				if(widgetState.data.length != widgetState.totalResults) {
					widgetState.page = 1;
					widgetState.highlightedIndex = 1;
				}
				widgetState.totalResults = widgetState.data.length;
			}
			widgetState.maximumNumberOfPages = Math.floor( widgetState.totalResults / ipp );
			if(widgetState.totalResults % ipp > 0) {
				widgetState.maximumNumberOfPages++;
			}
			if(widgetState.totalResults > 0) {
				threshold = ipp * widgetState.page;
				widgetState.startIndex = (threshold - ipp);
				for(var z = (threshold - ipp); z < threshold; z++) {
					if(z == widgetState.totalResults) {
						break;
					}
					paginatedItems.push(widgetState.data[z]);
				}
				widgetState.endIndex = --z;
			}
			if(widgetState.maximumNumberOfPages > 1) {
				paginatedItems.push( widgetState.paginationFooter );
			}
			widgetState.html = paginatedItems.join( "" );
		},
	    _createDropdownComponents: function() {
	    	var self = this,
	    		pos = self.element.parent().position(),
	    		$dropdown_close_Btn = $("<div></div>", {
					"class": self.wp.widgetBaseClass + self.wp.hyphen + self.wp.closeBtnLabel,
					"html": "<div class=\"x-close-btn-icon\"/>",
					"click": function( event ) {
	    				event.preventDefault();
	    				self._cleanup();
	    			}
				}),
				$dropdown_container = $("<div></div>", {
					"class": self.wp.widgetBaseClass + self.wp.hyphen + self.wp.containerLabel,
					"width": self.options.dropdownWidth > 0 ? self.options.dropdownWidth : self.element.parent().width(),
					"html": self._getWidgetState().html
				});

			self.element.parent().append( $dropdown_container );
			$dropdown_container.position({
				my: "top",
				at: "bottom",
				of: self.element.parent(),
				offset: "0 -1"
			}).css("left", pos.left + "px");

			if(self.options.closeBtnRequired) {
				self.element.parent().append( $dropdown_close_Btn );
				$dropdown_close_Btn.position({
					my: "left top",
					at: "right top",
					of: $dropdown_container,
					offset: "-5 -5"
				});
			}
	    },
	    _updateFooterInfo: function() {
	    	if(this.options.footerRequired) {
	    		var widgetState = this._getWidgetState(), 
	    			_html = null;
	    		if(widgetState.maximumNumberOfPages > 1) {
	    			_html = (widgetState.startIndex + 1) + this.wp.space + this.wp.hyphen + this.wp.space + (widgetState.endIndex + 1) + this.wp.space + this.wp.ofLabel + this.wp.space + widgetState.totalResults;
	    			this.element.parent().find( "." + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.footerInfoLabel ).html( _html );
	    		}
	    	}
	    },
	    _bindDropdownComponentEvents: function() {
	    	var self = this,
	    		parent = self.element.parent();
	    	// bind footer events only if footer is required.
	    	if(self.options.footerRequired) {
	    		// TODO: If customisable footer is provided, then we should be able to specify elements to attach events too,
	    		// rather than creating a generic CSS definition to attach the events to.
		    	parent.find( "." + self.wp.widgetBaseClass + self.wp.hyphen + self.wp.footerLabel ).bind("click dblclick", function( e ) {
		    		self.element.focus();
		    	});
		    	parent.find( "." + self.wp.widgetBaseClass + self.wp.hyphen + self.wp.footerRightNavLabel ).bind("click dblclick", function( e ) {
		    		self._nextPage(e, self);
		    	});
		    	parent.find( "." + self.wp.widgetBaseClass + self.wp.hyphen + self.wp.footerLeftNavLabel ).bind("click dblclick", function( e ) {
		    		self._prevPage(e, self);
		    	});
	    	}
	    	parent.find( "." + self.wp.widgetBaseClass + self.wp.hyphen + self.wp.containerLabel + " > div" ).each(function(index, item) {
	    		if(!$( item ).hasClass( self.wp.widgetBaseClass + self.wp.hyphen + self.wp.footerLabel )) {
	    			$( item ).click(function(e) {
	    				self._highlightItem(index + 1);
	    				self._itemSelection(e);
	    			});
	    		}
	    	});
	    },
		_constructPaginationFooterTemplate: function() {
	    	if(this.options.footerRequired) {
		    	var widgetState = this._getWidgetState();
		    	widgetState.paginationFooter = '<div class="' + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.footerLabel + '">';
					widgetState.paginationFooter += '<div class="' + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.footerContentLabel + '">';
						widgetState.paginationFooter += '<span class="' + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.footerLeftNavLabel + '">&lt;</span>';
						widgetState.paginationFooter += '<span class="' + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.footerInfoLabel + '"></span>';
						widgetState.paginationFooter += '<span class="' + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.footerRightNavLabel + '">&gt;</span>';
					widgetState.paginationFooter += '</div>';
				widgetState.paginationFooter += '</div>';
	    	}
		},
		_highlightItem: function(index) {
			// making sure that the already selected-item is removed first
			this._removeItemHighlight();
			this._getWidgetState().highlightedIndex = index;
			this.element.parent().find( "." + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.containerLabel + " > div:nth-child( " + index + " )" ).addClass( this.wp.selectedItemClass );
		},
		_markAllItems: function() {
			var self = this,
				items = this.element.siblings( "." + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.containerLabel ).children().not( "." + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.footerLabel );
			items.each(function(index, item) {
				$( item ).addClass( self.wp.widgetBaseClass + self.wp.hyphen + self.wp.itemLabel );
			});
		},
		_removeItemHighlight: function(selectedItem) {
			if(!selectedItem) {
				selectedItem = this.element.parent().find("." + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.containerLabel + " > div." + this.wp.selectedItemClass);
			}
			selectedItem.removeClass( this.wp.selectedItemClass );
		},
		_cleanup: function() {
			if(this.options.closeBtnRequired) {
				this.element.parent().find( "." + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.closeBtnLabel ).remove();
			}
			this.element.parent().find( "." + this.wp.widgetBaseClass + this.wp.hyphen + this.wp.containerLabel ).remove();
		},
		_setWidgetState: function() {
			var _widgetState = {
	    			page: 1,
	    			html: null,
	    			startIndex: 1,
	    			endIndex: 1,
	    			totalResults: 0,
	    			paginationFooter: "",
	    			highlightedIndex: 1,
	    			maximumNumberOfPages: 0,
	    			data: null,
	    			fetchedData: null
				};
			this.element.data({"widgetState": _widgetState});
			this._constructPaginationFooterTemplate();
		},
		_getWidgetState: function() {
			return this.element.data("widgetState");
		},
		_resetWidgetState: function() {
			this._setWidgetState();
		},
	    _fireEvent: function(eventName, event, data) {
	    	if(eventName === this.wp.itemSelectedEvent && !data) {
	    		data = this._getSelectedItemObject();
	    	}
	    	this._resetWidgetState();
			this._trigger(eventName, event, data);
	    },
	    _getSelectedItemObject: function() {
	    	var data = {},
	    		widgetState = this._getWidgetState(),
	    		od = widgetState.fetchedData;
    		if(od && od.length > 0) {
    			data = od[widgetState.startIndex + widgetState.highlightedIndex - 1];
    		}
    		return data;
	    },
	    _setOption: function( key, value ) {
	    	if(this._super) {
	    		this._super( key, value );
	    		return;
	    	}
	        $.Widget.prototype._setOption.apply( this, arguments );
	    },
	    _setOptions: function( options ) {
	    	if(this._super) {
		        this._super( options );
	    		return;
	    	}
	    	$.Widget.prototype._setOptions.apply( this, arguments );
	    },
	    destroy: function() {
	    	this._cleanup();
	    	this.element.removeClass( this.wp.widgetBaseClass ).unwrap();
	    	// remove/destroy all the associated events
	    	this.element.unbind();
	    	$.Widget.prototype.destroy.call( this );
	    }
	});
}(jQuery));