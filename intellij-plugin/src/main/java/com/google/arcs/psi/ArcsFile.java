package com.google.arcs.psi;

import com.intellij.extapi.psi.PsiFileBase;
import com.intellij.openapi.fileTypes.FileType;
import com.intellij.psi.FileViewProvider;
import com.google.arcs.*;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;

public class ArcsFile extends PsiFileBase {
  public ArcsFile(@NotNull FileViewProvider viewProvider) {
    super(viewProvider, ArcsLanguage.INSTANCE);
  }

  @NotNull
  @Override
  public FileType getFileType() {
    return ArcsFileType.INSTANCE;
  }

  @Override
  public String toString() {
    return "Arcs File";
  }

  @Override
  public Icon getIcon(int flags) {
    return super.getIcon(flags);
  }
}
