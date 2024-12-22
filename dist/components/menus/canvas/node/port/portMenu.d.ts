/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/
import './portMenu.scss';
type AddPortLabel = (port: any) => void;
type RemoveCreatedPort = (port: any) => void;
type RemovePortLabel = () => void;
export declare const portMenu: (addPortLabel: AddPortLabel, removePortLabel: RemovePortLabel, removeCreatedPort: RemoveCreatedPort) => (x: number, y: number) => void;
export {};
