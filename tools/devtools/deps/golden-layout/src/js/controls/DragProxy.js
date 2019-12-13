/// BareSpecifier=golden-layout\src\js\controls\DragProxy
/**
 * This class creates a temporary container
 * for the component whilst it is being dragged
 * and handles drag events
 *
 * @constructor
 * @private
 *
 * @param {Number} x              The initial x position
 * @param {Number} y              The initial y position
 * @param {lm.utils.DragListener} dragListener
 * @param {lm.LayoutManager} layoutManager
 * @param {lm.item.AbstractContentItem} contentItem
 * @param {lm.item.AbstractContentItem} originalParent
 */
lm.controls.DragProxy = function (x, y, dragListener, layoutManager, contentItem, originalParent) {

	lm.utils.EventEmitter.call(this);

	this._dragListener = dragListener;
	this._layoutManager = layoutManager;
	this._contentItem = contentItem;
	this._originalParent = originalParent;

	this._area = null;
	this._lastValidArea = null;

	this._dragListener.on('drag', this._onDrag, this);
	this._dragListener.on('dragStop', this._onDrop, this);

	this.element = $(lm.controls.DragProxy._template);
	if (originalParent && originalParent._side) {
		this._sided = originalParent._sided;
		this.element.addClass('lm_' + originalParent._side);
		if (['right', 'bottom'].indexOf(originalParent._side) >= 0) this.element.find('.lm_content').after(this.element.find('.lm_header'));
	}
	this.element.css({ left: x, top: y });
	this.element.find('.lm_tab').attr('title', lm.utils.stripTags(this._contentItem.config.title));
	this.element.find('.lm_title').html(this._contentItem.config.title);
	this.childElementContainer = this.element.find('.lm_content');
	this.childElementContainer.append(contentItem.element);

	this._updateTree();
	this._layoutManager._$calculateItemAreas();
	this._setDimensions();

	$(document.body).append(this.element);

	var offset = this._layoutManager.container.offset();

	this._minX = offset.left;
	this._minY = offset.top;
	this._maxX = this._layoutManager.container.width() + this._minX;
	this._maxY = this._layoutManager.container.height() + this._minY;
	this._width = this.element.width();
	this._height = this.element.height();

	this._setDropPosition(x, y);
};

lm.controls.DragProxy._template = '<div class="lm_dragProxy">' + '<div class="lm_header">' + '<ul class="lm_tabs">' + '<li class="lm_tab lm_active"><i class="lm_left"></i>' + '<span class="lm_title"></span>' + '<i class="lm_right"></i></li>' + '</ul>' + '</div>' + '<div class="lm_content"></div>' + '</div>';

lm.utils.copy(lm.controls.DragProxy.prototype, {

	/**
  * Callback on every mouseMove event during a drag. Determines if the drag is
  * still within the valid drag area and calls the layoutManager to highlight the
  * current drop area
  *
  * @param   {Number} offsetX The difference from the original x position in px
  * @param   {Number} offsetY The difference from the original y position in px
  * @param   {jQuery DOM event} event
  *
  * @private
  *
  * @returns {void}
  */
	_onDrag: function (offsetX, offsetY, event) {

		event = event.originalEvent && event.originalEvent.touches ? event.originalEvent.touches[0] : event;

		var x = event.pageX,
		    y = event.pageY,
		    isWithinContainer = x > this._minX && x < this._maxX && y > this._minY && y < this._maxY;

		if (!isWithinContainer && this._layoutManager.config.settings.constrainDragToContainer === true) {
			return;
		}

		this._setDropPosition(x, y);
	},

	/**
  * Sets the target position, highlighting the appropriate area
  *
  * @param   {Number} x The x position in px
  * @param   {Number} y The y position in px
  *
  * @private
  *
  * @returns {void}
  */
	_setDropPosition: function (x, y) {
		this.element.css({ left: x, top: y });
		this._area = this._layoutManager._$getArea(x, y);

		if (this._area !== null) {
			this._lastValidArea = this._area;
			this._area.contentItem._$highlightDropZone(x, y, this._area);
		}
	},

	/**
  * Callback when the drag has finished. Determines the drop area
  * and adds the child to it
  *
  * @private
  *
  * @returns {void}
  */
	_onDrop: function () {
		this._layoutManager.dropTargetIndicator.hide();

		/*
   * Valid drop area found
   */
		if (this._area !== null) {
			this._area.contentItem._$onDrop(this._contentItem, this._area);

			/**
    * No valid drop area available at present, but one has been found before.
    * Use it
    */
		} else if (this._lastValidArea !== null) {
			this._lastValidArea.contentItem._$onDrop(this._contentItem, this._lastValidArea);

			/**
    * No valid drop area found during the duration of the drag. Return
    * content item to its original position if a original parent is provided.
    * (Which is not the case if the drag had been initiated by createDragSource)
    */
		} else if (this._originalParent) {
			this._originalParent.addChild(this._contentItem);

			/**
    * The drag didn't ultimately end up with adding the content item to
    * any container. In order to ensure clean up happens, destroy the
    * content item.
    */
		} else {
			this._contentItem._$destroy();
		}

		this.element.remove();

		this._layoutManager.emit('itemDropped', this._contentItem);
	},

	/**
  * Removes the item from its original position within the tree
  *
  * @private
  *
  * @returns {void}
  */
	_updateTree: function () {

		/**
   * parent is null if the drag had been initiated by a external drag source
   */
		if (this._contentItem.parent) {
			this._contentItem.parent.removeChild(this._contentItem, true);
		}

		this._contentItem._$setParent(this);
	},

	/**
  * Updates the Drag Proxie's dimensions
  *
  * @private
  *
  * @returns {void}
  */
	_setDimensions: function () {
		var dimensions = this._layoutManager.config.dimensions,
		    width = dimensions.dragProxyWidth,
		    height = dimensions.dragProxyHeight;

		this.element.width(width);
		this.element.height(height);
		width -= this._sided ? dimensions.headerHeight : 0;
		height -= !this._sided ? dimensions.headerHeight : 0;
		this.childElementContainer.width(width);
		this.childElementContainer.height(height);
		this._contentItem.element.width(width);
		this._contentItem.element.height(height);
		this._contentItem.callDownwards('_$show');
		this._contentItem.callDownwards('setSize');
	}
});