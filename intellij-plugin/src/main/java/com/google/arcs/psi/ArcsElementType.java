package com.google.arcs.psi;

import com.google.arcs.ArcsLanguage;
import com.intellij.psi.tree.IElementType;
import org.jetbrains.annotations.*;

public class ArcsElementType extends IElementType {
  public ArcsElementType(@NotNull @NonNls String debugName) {
    super(debugName, ArcsLanguage.INSTANCE);
  }
}
