/************************************************************************
 *    Copyright (C) 2024 Code Forge Temple                              *
 *    This file is part of circuit-sketcher-core project                *
 *    Licensed under the GNU General Public License v3.0.               *
 *    See the LICENSE file in the project root for more information.    *
 ************************************************************************/

import React, {useState} from "react";
import {CanvasManager} from "../CanvasManager";
import "./ModalAddImage.scss";


const MODAL_ID = "modal-dialog";
const MODAL_VISIBILITY_CLASS = "modal-show";

export const closeModal = () => {
    document.getElementById(MODAL_ID)?.classList.remove(MODAL_VISIBILITY_CLASS);
}

export const openModal = (dataNodeId: string) => {
    const modal = document.getElementById(MODAL_ID);

    if (modal) {
        const imageInput = modal.querySelector("#imageInput") as HTMLInputElement;

        if (imageInput) {
            imageInput.value = "";
            imageInput.dataset.nodeId = dataNodeId;
        }

        modal.classList.add(MODAL_VISIBILITY_CLASS);
    }
}

export const ModalAddImage = () => {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    const handleAddImage = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();

        const fileInput = document.getElementById("imageInput") as HTMLInputElement;

        if (fileInput.files && fileInput.files.length > 0) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const imgSrc = e.target?.result as string;
                const dataNodeId = fileInput.dataset.nodeId;

                if (!dataNodeId) {
                    console.error("No data-node-id found in the image input");
                    return;
                }

                CanvasManager.getInstance().setNodeImage(dataNodeId, imgSrc);

                handleCloseModal();
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
    };

    const handleCloseModal = () => {
        closeModal();

        setTimeout(() => {
            setSelectedFile(null);
        }, 500);
    };

    const handleFileInputClick = () => {
        const fileInput = document.getElementById("imageInput") as HTMLInputElement;
        fileInput.click();
    };


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0].name);
        } else {
            setSelectedFile(null);
        }
    };

    return (
        <div id={MODAL_ID} className="circuit-sketcher-core modal-window">
            <div>
                <span className="modal-close" onClick={handleCloseModal}>Close</span>
                <h1>Add Image</h1>
                <div className="modal-content">
                    <input type="file" id="imageInput" accept="image/*" style={{display: 'none'}} onChange={handleFileChange} />
                    <div>
                        <button type="button" className="btn" onClick={handleFileInputClick}>
                            <span>Select Image</span>
                        </button>
                        <span className="selected-file">{selectedFile ? selectedFile : "No Image Selected"}</span>
                    </div>
                    <button type="button" className="btn" onClick={handleAddImage}>Add Image</button>
                </div>
            </div>
        </div>
    );
}