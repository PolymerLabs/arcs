package com.google.arcs;

import com.intellij.lang.*;
import com.intellij.lexer.Lexer;
import com.intellij.openapi.project.Project;
import com.intellij.psi.*;
import com.intellij.psi.tree.*;
import com.google.arcs.parser.ArcsParser;
import com.google.arcs.psi.*;
import org.jetbrains.annotations.NotNull;

public class ArcsParserDefinition implements ParserDefinition {
  public static final TokenSet WHITE_SPACES = TokenSet.create(
      TokenType.WHITE_SPACE);

  public static final TokenSet COMMENTS = TokenSet.create(ArcsTypes.COMMENT);

  public static final IFileElementType FILE = new IFileElementType(ArcsLanguage.INSTANCE);

  @NotNull
  @Override
  public Lexer createLexer(Project project) {
    return new ArcsLexerAdapter();
  }

  @NotNull
  public TokenSet getWhitespaceTokens() {
    return WHITE_SPACES;
  }

  @NotNull
  public TokenSet getCommentTokens() {
    return COMMENTS;
  }

  @NotNull
  public TokenSet getStringLiteralElements() {
    return TokenSet.EMPTY;
  }

  @NotNull
  public PsiParser createParser(final Project project) {
    return new ArcsParser();
  }

  @Override
  public IFileElementType getFileNodeType() {
    return FILE;
  }

  public PsiFile createFile(FileViewProvider viewProvider) {
    return new ArcsFile(viewProvider);
  }

  public SpaceRequirements spaceExistenceTypeBetweenTokens(ASTNode left, ASTNode right) {
    return SpaceRequirements.MAY;
  }

  @NotNull
  public PsiElement createElement(ASTNode node) {
    return ArcsTypes.Factory.createElement(node);
  }
}
