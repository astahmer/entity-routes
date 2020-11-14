import {
    Button,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    ModalProps,
} from "@chakra-ui/react";
import { ReactNode } from "react";

export type BasicDialogProps = Pick<ModalProps, "children" | "isOpen" | "onClose"> & {
    title: string;
    actions?: ReactNode;
};

export function BasicDialog({ children, isOpen, onClose, title, actions }: BasicDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} blockScrollOnMount={false}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{title}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>{children}</ModalBody>

                <ModalFooter>
                    <Button mr={3} onClick={onClose}>
                        Close
                    </Button>
                    {actions}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
