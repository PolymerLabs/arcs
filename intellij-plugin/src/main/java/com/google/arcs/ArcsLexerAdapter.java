package com.google.arcs;

import com.intellij.lexer.FlexAdapter;

import java.io.Reader;

public class ArcsLexerAdapter extends FlexAdapter {
  public ArcsLexerAdapter() {
    super(new ArcsLexer((Reader) null));
  }
}
