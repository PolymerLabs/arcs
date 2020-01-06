package com.google.arcs.psi;

import com.intellij.psi.tree.IElementType;
import com.google.arcs.ArcsLanguage;
import org.jetbrains.annotations.*;

public class ArcsTokenType extends IElementType {

  public ArcsTokenType(@NotNull @NonNls String debugName) {
    super(debugName, ArcsLanguage.INSTANCE);
  }

  @Override
  public String toString() {
    return "ArcsTokenType." + super.toString();
  }
}
