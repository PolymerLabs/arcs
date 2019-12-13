/// BareSpecifier=golden-layout\src\js\items\Component
/**
 * @param {[type]} layoutManager [description]
 * @param {[type]} config      [description]
 * @param {[type]} parent        [description]
 */
lm.items.Component = function (layoutManager, config, parent) {
	lm.items.AbstractContentItem.call(this, layoutManager, config, parent);

	var ComponentConstructor = layoutManager.getComponent(this.config.componentName),
	    componentConfig = $.extend(true, {}, this.config.componentState || {});

	componentConfig.componentName = this.config.componentName;
	this.componentName = this.config.componentName;

	if (this.config.title === '') {
		this.config.title = this.config.componentName;
	}

	this.isComponent = true;
	this.container = new lm.container.ItemContainer(this.config, this, layoutManager);
	this.instance = new ComponentConstructor(this.container, componentConfig);
	this.element = this.container._element;
};

lm.utils.extend(lm.items.Component, lm.items.AbstractContentItem);

lm.utils.copy(lm.items.Component.prototype, {

	close: function () {
		this.parent.removeChild(this);
	},

	setSize: function () {
		if (this.element.is(':visible')) {
			// Do not update size of hidden components to prevent unwanted reflows
			this.container._$setSize(this.element.width(), this.element.height());
		}
	},

	_$init: function () {
		lm.items.AbstractContentItem.prototype._$init.call(this);
		this.container.emit('open');
	},

	_$hide: function () {
		this.container.hide();
		lm.items.AbstractContentItem.prototype._$hide.call(this);
	},

	_$show: function () {
		this.container.show();
		lm.items.AbstractContentItem.prototype._$show.call(this);
	},

	_$shown: function () {
		this.container.shown();
		lm.items.AbstractContentItem.prototype._$shown.call(this);
	},

	_$destroy: function () {
		this.container.emit('destroy', this);
		lm.items.AbstractContentItem.prototype._$destroy.call(this);
	},

	/**
  * Dragging onto a component directly is not an option
  *
  * @returns null
  */
	_$getArea: function () {
		return null;
	}
});