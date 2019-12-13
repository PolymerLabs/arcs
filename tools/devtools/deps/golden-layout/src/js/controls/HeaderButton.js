/// BareSpecifier=golden-layout\src\js\controls\HeaderButton
lm.controls.HeaderButton = function (header, label, cssClass, action) {
	this._header = header;
	this.element = $('<li class="' + cssClass + '" title="' + label + '"></li>');
	this._header.on('destroy', this._$destroy, this);
	this._action = action;
	this.element.on('click touchstart', this._action);
	this._header.controlsContainer.append(this.element);
};

lm.utils.copy(lm.controls.HeaderButton.prototype, {
	_$destroy: function () {
		this.element.off();
		this.element.remove();
	}
});