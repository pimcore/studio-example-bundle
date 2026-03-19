<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Model\Document\Editable;

use Pimcore\Model;

class Markdown extends Model\Document\Editable implements Model\Document\Editable\EditmodeDataInterface
{
    protected ?string $text = null;

    public function getType(): string
    {
        return 'markdown';
    }

    public function getData(): mixed
    {
        return (string) $this->text;
    }

    public function frontend()
    {
        return $this->text;
    }

    public function getDataEditmode(): string
    {
        return htmlentities((string)$this->text);
    }

    public function setDataFromResource(mixed $data): static
    {
        $this->text = $data;

        return $this;
    }

    public function setDataFromEditmode(mixed $data): static
    {
        $data = html_entity_decode($data, ENT_HTML5 | ENT_QUOTES);
        $this->text = $data;

        return $this;
    }

    public function isEmpty(): bool
    {
        return empty($this->text);
    }
}
