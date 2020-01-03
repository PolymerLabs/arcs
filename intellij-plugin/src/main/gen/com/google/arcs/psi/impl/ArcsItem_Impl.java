// This is a generated file. Not intended for manual editing.
package com.google.arcs.psi.impl;

import java.util.List;
import org.jetbrains.annotations.*;
import com.intellij.lang.ASTNode;
import com.intellij.psi.PsiElement;
import com.intellij.psi.PsiElementVisitor;
import com.intellij.psi.util.PsiTreeUtil;
import static com.google.arcs.psi.ArcsTypes.*;
import com.intellij.extapi.psi.ASTWrapperPsiElement;
import com.google.arcs.psi.*;

public class ArcsItem_Impl extends ASTWrapperPsiElement implements ArcsItem_ {

  public ArcsItem_Impl(@NotNull ASTNode node) {
    super(node);
  }

  public void accept(@NotNull ArcsVisitor visitor) {
    visitor.visitItem_(this);
  }

  public void accept(@NotNull PsiElementVisitor visitor) {
    if (visitor instanceof ArcsVisitor) accept((ArcsVisitor)visitor);
    else super.accept(visitor);
  }

  @Override
  @Nullable
  public ArcsDescriptionDecl getDescriptionDecl() {
    return findChildByClass(ArcsDescriptionDecl.class);
  }

  @Override
  @Nullable
  public ArcsHandleDecl getHandleDecl() {
    return findChildByClass(ArcsHandleDecl.class);
  }

  @Override
  @Nullable
  public ArcsImportDecl getImportDecl() {
    return findChildByClass(ArcsImportDecl.class);
  }

  @Override
  @Nullable
  public ArcsParticleDecl getParticleDecl() {
    return findChildByClass(ArcsParticleDecl.class);
  }

  @Override
  @Nullable
  public ArcsRecipeDecl getRecipeDecl() {
    return findChildByClass(ArcsRecipeDecl.class);
  }

  @Override
  @Nullable
  public ArcsSchemaDecl getSchemaDecl() {
    return findChildByClass(ArcsSchemaDecl.class);
  }

  @Override
  @Nullable
  public ArcsStoreDecl getStoreDecl() {
    return findChildByClass(ArcsStoreDecl.class);
  }

}
