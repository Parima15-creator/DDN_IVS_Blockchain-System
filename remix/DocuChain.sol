// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DocuChain - Blockchain-Based Document Registration & Verification System
 * @author Computer Engineering Capstone Project
 * @notice Allows users to register cryptographic SHA-256 hashes of digital documents
 *         and publicly verify authenticity, timestamp, owner, and revocation status.
 * @dev Files themselves are NEVER uploaded to Ethereum; only bytes32 cryptographic hashes.
 */
contract DocuChain {
    // Structure storing on-chain metadata for each registered document
    struct Document {
        string documentName;           // Human-readable document title
        address owner;                 // Ethereum address of registering party
        uint256 registrationTimestamp; // Block timestamp of initial registration
        bool isRevoked;                // Flag indicating if document has been invalidated
        bool exists;                   // Helper boolean to prevent duplicate registrations
    }

    // Hash => Document metadata mapping
    mapping(bytes32 => Document) private documents;

    // Owner address => Array of document hashes registered by this account
    mapping(address => bytes32[]) private userDocuments;

    // Global array of registered document hashes for auditability
    bytes32[] private allRegisteredHashes;

    // Events emitted for transparent off-chain indexing and frontend activity feeds
    event DocumentRegistered(
        bytes32 indexed documentHash,
        string documentName,
        address indexed owner,
        uint256 timestamp
    );

    event DocumentRevoked(
        bytes32 indexed documentHash,
        address indexed owner,
        uint256 timestamp
    );

    // Custom errors for gas efficiency
    error EmptyHash();
    error EmptyDocumentName();
    error DocumentAlreadyRegistered(bytes32 documentHash);
    error DocumentNotFound(bytes32 documentHash);
    error NotDocumentOwner(address caller, address owner);
    error DocumentAlreadyRevoked(bytes32 documentHash);

    /**
     * @notice Registers a new document hash on the Ethereum blockchain.
     * @param _documentHash The 32-byte SHA-256 cryptographic digest of the document.
     * @param _documentName A user-defined label or title for the document.
     */
    function registerDocument(bytes32 _documentHash, string calldata _documentName) external {
        if (_documentHash == bytes32(0)) revert EmptyHash();
        if (bytes(_documentName).length == 0) revert EmptyDocumentName();
        if (documents[_documentHash].exists) revert DocumentAlreadyRegistered(_documentHash);

        // Store document record
        documents[_documentHash] = Document({
            documentName: _documentName,
            owner: msg.sender,
            registrationTimestamp: block.timestamp,
            isRevoked: false,
            exists: true
        });

        // Track ownership
        userDocuments[msg.sender].push(_documentHash);
        allRegisteredHashes.push(_documentHash);

        emit DocumentRegistered(_documentHash, _documentName, msg.sender, block.timestamp);
    }

    /**
     * @notice Verifies whether a document hash is registered and returns its current status.
     * @param _documentHash The 32-byte SHA-256 hash to query.
     * @return isRegistered True if the document exists in blockchain storage.
     * @return isRevoked True if the document has been revoked by its owner.
     * @return documentName The title recorded during registration.
     * @return owner The address that registered the document.
     * @return registrationTimestamp The Unix timestamp when the document was sealed on-chain.
     */
    function verifyDocument(bytes32 _documentHash)
        external
        view
        returns (
            bool isRegistered,
            bool isRevoked,
            string memory documentName,
            address owner,
            uint256 registrationTimestamp
        )
    {
        Document memory doc = documents[_documentHash];
        if (!doc.exists) {
            return (false, false, "", address(0), 0);
        }
        return (
            true,
            doc.isRevoked,
            doc.documentName,
            doc.owner,
            doc.registrationTimestamp
        );
    }

    /**
     * @notice Revokes a previously registered document.
     * @dev Only the original registering owner can revoke their document.
     * @param _documentHash The hash of the document to revoke.
     */
    function revokeDocument(bytes32 _documentHash) external {
        Document storage doc = documents[_documentHash];

        if (!doc.exists) revert DocumentNotFound(_documentHash);
        if (msg.sender != doc.owner) revert NotDocumentOwner(msg.sender, doc.owner);
        if (doc.isRevoked) revert DocumentAlreadyRevoked(_documentHash);

        doc.isRevoked = true;

        emit DocumentRevoked(_documentHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Retrieves document details by hash.
     * @param _documentHash The hash to look up.
     */
    function getDocument(bytes32 _documentHash)
        external
        view
        returns (
            string memory documentName,
            address owner,
            uint256 registrationTimestamp,
            bool isRevoked
        )
    {
        Document memory doc = documents[_documentHash];
        if (!doc.exists) revert DocumentNotFound(_documentHash);
        return (doc.documentName, doc.owner, doc.registrationTimestamp, doc.isRevoked);
    }

    /**
     * @notice Returns all document hashes registered by a specific wallet address.
     * @param _owner The address to inspect.
     */
    function getUserDocuments(address _owner) external view returns (bytes32[] memory) {
        return userDocuments[_owner];
    }

    /**
     * @notice Quick boolean check if a document is registered.
     */
    function isDocumentRegistered(bytes32 _documentHash) external view returns (bool) {
        return documents[_documentHash].exists;
    }

    /**
     * @notice Returns the total count of registered documents.
     */
    function getTotalRegisteredDocuments() external view returns (uint256) {
        return allRegisteredHashes.length;
    }
}
