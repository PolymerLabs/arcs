package com.google.arcs;

import com.intellij.openapi.fileTypes.LanguageFileType;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;

public class ArcsFileType extends LanguageFileType {

  public static final ArcsFileType INSTANCE = new ArcsFileType();

  private ArcsFileType() {
    super(ArcsLanguage.INSTANCE);
  }

  @NotNull
  @Override
  public String getName() {
    return "Arcs manifest";
  }

  @NotNull
  @Override
  public String getDescription() {
    return "Arcs manifest file";
  }

  @NotNull
  @Override
  public String getDefaultExtension() {
    return "arcs";
  }

  @Nullable
  @Override
  public Icon getIcon() {
    return ArcsIcons.LOGO;
  }
}
