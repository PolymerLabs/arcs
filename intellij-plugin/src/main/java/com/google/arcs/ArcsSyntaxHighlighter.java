package com.google.arcs;

import com.google.arcs.psi.ArcsTypes;
import com.intellij.lexer.Lexer;
import com.intellij.openapi.editor.*;
import com.intellij.openapi.editor.colors.TextAttributesKey;
import com.intellij.openapi.fileTypes.SyntaxHighlighterBase;
import com.intellij.psi.TokenType;
import com.intellij.psi.tree.IElementType;
import com.intellij.ui.HighlightedText;
import org.jetbrains.annotations.NotNull;

import static com.intellij.openapi.editor.colors.TextAttributesKey.createTextAttributesKey;

public class ArcsSyntaxHighlighter extends SyntaxHighlighterBase {
  public static final TextAttributesKey BAD_CHARACTER =
      createTextAttributesKey("ARCS_BAD_CHARACTER", HighlighterColors.BAD_CHARACTER);
  public static final TextAttributesKey COLON =
      createTextAttributesKey("ARCS_COLON", DefaultLanguageHighlighterColors.COMMA);
  public static final TextAttributesKey COMMENT =
      createTextAttributesKey("ARCS_COMMENT", DefaultLanguageHighlighterColors.LINE_COMMENT);
  public static final TextAttributesKey PREP =
      createTextAttributesKey("ARCS_IN", DefaultLanguageHighlighterColors.KEYWORD);
  public static final TextAttributesKey VERB =
      createTextAttributesKey("ARCS_VERB", DefaultLanguageHighlighterColors.KEYWORD);
  public static final TextAttributesKey NAME =
      createTextAttributesKey("ARCS_NAME", DefaultLanguageHighlighterColors.CLASS_REFERENCE);
  public static final TextAttributesKey HANDLE =
      createTextAttributesKey("ARCS_HANDLE", DefaultLanguageHighlighterColors.INSTANCE_FIELD);
  public static final TextAttributesKey TYPE =
      createTextAttributesKey("ARCS_TYPE", DefaultLanguageHighlighterColors.CLASS_REFERENCE);
  public static final TextAttributesKey FILE =
      createTextAttributesKey("ARCS_FILE", DefaultLanguageHighlighterColors.STATIC_FIELD);
  public static final TextAttributesKey STRING_LITERAL =
      createTextAttributesKey("ARCS_STRING_LITERAL", DefaultLanguageHighlighterColors.STRING);
  public static final TextAttributesKey KEYWORD =
      createTextAttributesKey("ARCS_SCHEMA", DefaultLanguageHighlighterColors.KEYWORD);

  private static final TextAttributesKey[] EMPTY_KEYS = new TextAttributesKey[0];

  private static final TextAttributesKey[] BAD_CHAR_KEYS = new TextAttributesKey[]{BAD_CHARACTER};
  private static final TextAttributesKey[] COLON_KEYS = new TextAttributesKey[]{COLON};
  private static final TextAttributesKey[] COMMENT_KEYS = new TextAttributesKey[]{COMMENT};
  private static final TextAttributesKey[] PREP_KEYS = new TextAttributesKey[]{PREP};
  private static final TextAttributesKey[] VERB_KEYS = new TextAttributesKey[]{VERB};
  private static final TextAttributesKey[] FILE_KEYS = new TextAttributesKey[]{FILE};
  private static final TextAttributesKey[] STRING_LITERAL_KEYS = new TextAttributesKey[]{STRING_LITERAL};
  private static final TextAttributesKey[] KEYWORD_KEYS = new TextAttributesKey[]{KEYWORD};
  private static final TextAttributesKey[] NAME_KEYS = new TextAttributesKey[]{NAME};
  private static final TextAttributesKey[] TYPE_KEYS = new TextAttributesKey[]{TYPE};
  private static final TextAttributesKey[] HANDLE_KEYS = new TextAttributesKey[]{HANDLE};

  @NotNull
  @Override
  public Lexer getHighlightingLexer() {
    return new ArcsLexerAdapter();
  }

  @NotNull
  @Override
  public TextAttributesKey[] getTokenHighlights(IElementType tokenType) {
    if (tokenType.equals(TokenType.BAD_CHARACTER)) {
      return BAD_CHAR_KEYS;
    } else if (tokenType.equals(ArcsTypes.COLON)) {
      return COLON_KEYS;
    } else if (tokenType.equals(ArcsTypes.COMMENT)) {
      return COMMENT_KEYS;
    } else if (tokenType.equals(ArcsTypes.IN) ||
        tokenType.equals(ArcsTypes.OF)) {
      return PREP_KEYS;
    } else if (tokenType.equals(ArcsTypes.VERB)) {
      return VERB_KEYS;
    } else if (tokenType.equals(ArcsTypes.STRING_LITERAL)) {
      return STRING_LITERAL_KEYS;
    } else if (tokenType.equals(ArcsTypes.FILE)) {
      return FILE_KEYS;
    } else if (tokenType.equals(ArcsTypes.IMPORT) ||
        tokenType.equals(ArcsTypes.SCHEMA) ||
        tokenType.equals(ArcsTypes.PARTICLE) ||
        tokenType.equals(ArcsTypes.RECIPE) ||
        tokenType.equals(ArcsTypes.STORE) ||
        tokenType.equals(ArcsTypes.DESCRIPTION)) {
      return KEYWORD_KEYS;
    } else if (tokenType.equals(ArcsTypes.NAME)) {
      return NAME_KEYS;
    } else if (tokenType.equals(ArcsTypes.TYPE)) {
      return TYPE_KEYS;
    } else if (tokenType.equals(ArcsTypes.HANDLE)) {
      return HANDLE_KEYS;
    } else {
      return EMPTY_KEYS;
    }
  }
}