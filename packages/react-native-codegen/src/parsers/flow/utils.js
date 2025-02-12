/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

'use strict';

import type {TypeResolutionStatus, TypeDeclarationMap, ASTNode} from '../utils';
import type {Parser} from '../../parsers/parser';

const invariant = require('invariant');

function resolveTypeAnnotation(
  // TODO(T71778680): This is an Flow TypeAnnotation. Flow-type this
  typeAnnotation: $FlowFixMe,
  types: TypeDeclarationMap,
  parser: Parser,
): {
  nullable: boolean,
  typeAnnotation: $FlowFixMe,
  typeResolutionStatus: TypeResolutionStatus,
} {
  invariant(
    typeAnnotation != null,
    'resolveTypeAnnotation(): typeAnnotation cannot be null',
  );

  let node = typeAnnotation;
  let nullable = false;
  let typeResolutionStatus: TypeResolutionStatus = {
    successful: false,
  };

  for (;;) {
    if (node.type === 'NullableTypeAnnotation') {
      nullable = true;
      node = node.typeAnnotation;
      continue;
    }

    if (node.type !== 'GenericTypeAnnotation') {
      break;
    }

    const resolvedTypeAnnotation = types[node.id.name];
    if (resolvedTypeAnnotation == null) {
      break;
    }

    switch (resolvedTypeAnnotation.type) {
      case parser.typeAlias: {
        typeResolutionStatus = {
          successful: true,
          type: 'alias',
          name: node.id.name,
        };
        node = resolvedTypeAnnotation.right;
        break;
      }
      case parser.enumDeclaration: {
        typeResolutionStatus = {
          successful: true,
          type: 'enum',
          name: node.id.name,
        };
        node = resolvedTypeAnnotation.body;
        break;
      }
      default: {
        throw new TypeError(
          `A non GenericTypeAnnotation must be a type declaration ('${parser.typeAlias}') or enum ('${parser.enumDeclaration}'). Instead, got the unsupported ${resolvedTypeAnnotation.type}.`,
        );
      }
    }
  }

  return {
    nullable: nullable,
    typeAnnotation: node,
    typeResolutionStatus,
  };
}

function getValueFromTypes(value: ASTNode, types: TypeDeclarationMap): ASTNode {
  if (value.type === 'GenericTypeAnnotation' && types[value.id.name]) {
    return getValueFromTypes(types[value.id.name].right, types);
  }
  return value;
}

module.exports = {
  getValueFromTypes,
  resolveTypeAnnotation,
};
